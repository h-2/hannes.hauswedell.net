---

author: h2
date: 2025-04-25 22:00:00+00:00

title: Owning and non-owning C++ Ranges | The RADR library part 1

slug: 25/radr0

fsfe_commentid:
gh_commentid:
tweetid:
tootid:

draft: true

toc: true

categories:
- Programming
- cplusplus

tags:
- cplusplus
- modern_cpp
- ranges
- views


---

This is the first article in a series discussing some of the underlying properties of C++ ranges and in particular *range adaptors*. At the same time, I introduce the design of an experimental library which aims to solve some of the problems discussed here.

<!--more-->

## Background

C++ Ranges are one of the major features of C++20. See my [previous post]({{< ref "30 - range_intro.md" >}} "previous post") for a detailed introduction.
I am a big fan of C++ Ranges and have used them extensively in multiple projects (mostly bioinformatics, data science, …), but I have had difficulty convincing other people of the benefits and have seen many programmers struggle with even basic usage.
Furthermore, there have been significant conceptual changes to the Ranges part of ISO standard *after* initial publication of C++20, showing the volatility of the design and making it even more difficult for non-expert users to understand what's going on.
Even now, there are still controversial discussions within the ISO C++ committee regarding vary basic aspects of C++ Ranges and views.

I see multiple challenges with the current design, that I group into the following topics:

1. Owning and non-owning ranges.
2. Regular and irregular ranges.
3. Ranges and `const`.
4. Range capture and safety.

I will write a blog post on each of these topics and try to address the problems by showing a different experimental library design. This is the first article in the series.

*DISCLAIMER:* I have been using Ranges since a long time and consider myself more knowledgeable than most C++ programmers in this area. However, I am also very aware that other people did the heavy lifting of bringing ranges into the standard, and it is very possible that there are things I haven't considered.
I would further like to stress that I am happy we got the current state into the standard, and I do not criticise the committee for re-designing certain aspects of views.
In fact, I have reversed my own position on several problems multiple times, and I am sure I wouldn't have come to the conclusions drawn here without the previous iterations of the design.

## The Standard Library (prior to `std::ranges::`)

We will begin by having a look at standard library entities prior to the introduction of `std::ranges::`, since this is what people are most used to.
Note that although the entities themselves are from C++17, I will use some terminology and concepts introduced later to explain how they relate to each other.

### Containers (owning multi-pass ranges)

Containers are the ranges everybody already used before *Ranges* were a thing.
They *own* their elements, i.e. the storage of the elements is managed by the container and the elements disappear when the container does.
Containers are *multi-pass ranges*, i.e. you can iterate over them multiple times and will always observe the same elements.[^next]

[^next]: We will explore this in more depth in the next blog post.

TODO image of string


```cpp
/* construction and copying */
std::string s  = "foobar";      // copies characters from static storage into string [O(n)]
std::string s2 = s;             // copies all characters from s into s2              [O(n)]

/* find the smallest character in a string */
char c = *std::ranges::min_element(s);
assert(c == 'a');

/* the same thing with a temporary */
// char d = *std::ranges::min_element(std::string{"foobar"});
// assert(d == 'a');
```

<center>

*Examples illustrating "container semantics".*

</center>

Although the `"foobar"` string literal itself has static storage, a new string is allocated[^heap] and the characters are copied into it.
Copying the container itself, copies the elements (*O(n)* complexity).[^next]

We can subsequently call `std::ranges::min_element` on it to get the iterator pointing to the lexicographically smallest character.
The same does not work for a temporary of a string, because its elements go out-of-scope together with the container when `min_element` returns; the iterator would be dangling.[^dangling]

[^dangling]: *Actually,* `std::ranges::min_element` is smart enough to know that the iterator would dangle and returns `std::ranges::dangling` instead. This prevents undefined behaviour, but it also results in us not getting the smallest character.

[^heap]: Most containers store their elements on the heap, but `std::array` and C++26's `std::inplace_vector` store on the stack. `std::string` is a special case, because small strings are stored on the stack and bigger ones on the heap. However, both cases lead to undefined behaviour.


### Borrowed ranges (non-owning multi-pass ranges)

C++17 introduced the first example of what would later be called a *borrowed range*: `std::string_view`

Borrowed ranges are ranges that "borrow" all of their state including (but not limited to) the elements from another range. This has the important implication that the iterators of a borrowed range remain valid when the borrowed range itself goes out-of-scope.

TODO image


The above image illustrates the "indirection" of borrowed ranges.


```cpp
/* construction and copying */
std::string_view s  = "foobar";      // "binds" s to the static storage   [O(1)]
std::string_view s2 = s;             // "binds" s2 to the static storage  [O(1)]

/* find the smallest character in a string */
char c = *std::ranges::min_element(s);
assert(c == 'a');

/* the same thing with a temporary */
char d = *std::ranges::min_element(std::string_view{"foobar"});
assert(d == 'a');
```

<center>

*Examples illustrating "borrowed range semantics".*

</center>

The `std::string_view s1` binds to the static storage of the string literal; no allocation or character copies take place.
This is also true for `s2` which refers to the same static storage (and not `s`!).
Thus, copying `string_view`s is in *O(1)*.
While it is particularly useful to wrap string literals in `std::string_view`, you can also have a `std::string_view` refer to a `std::string`, a substring of a `std::string` or even a `std::vector<char>`.

Finding the smallest character works in the same way as for the `std::string`, however, we can now also search a temporary, because iterators into that `string_view` are not dependent on the `string_views`'s lifetime.

### Single-pass ranges

A single-pass range is one that does not offer the multi-pass guarantee, i.e. you may not be able to iterate over it multiple times, or might encounter different elements when you do.
Iterating over the range, changes the range.
It is not even guaranteed that you can call `.begin()` more than once.

TODO image


Conceptionally, a single-pass ranges is more "a machine that produces elements" than "a collection of elements".
And the iterator of such a range is not an "observer object", instead it is part of the machine.
No dedicated single-pass range exists in pre C++20 times, and few single-pass iterators do, e.g. `std::istream_iterator` which exposes the characters of an input stream.


The relationship of single-pass ranges to the question of "owning vs non-owning" is complicated:
* They are often move-only types that cannot be copied (neither *O(1)* nor *O(n)*).
* It is difficult to argue if the elements are "owned" at all, since they are usually "produced" and "consumed" immediately; iterators to previous elements become invalid.
* It doesn't make sense to borrow from single-pass ranges, because you can only have one valid iterator anyway.[^sp_borrow]

Thus I suggest keeping single-pass ranges as their own separate category, and will not cover them further in this blog post.[^next]

[^sp_borrow]: Subsequent blog posts will explain that you cannot have a "read-only" borrow on a single-pass range, because single-pass ranges are not const-iterable. In addition, having a mutable borrow on a single-pass range provides no benefits over just passing the range itself; you cannot use the range anymore once you have borrowed from it.

<!--### Summary


| Range                   | Iterators  |                        |                      |
|-------------------------|------------|------------------------|----------------------|
| owning + multi-pass     | observing  | mutually independent   | lifetime-dependent   |
| borrowed + multi-pass   | observing  | mutually independent   | lifetime-independent |
| single-pass             | mutating   |interdependent/singular | (lifetime-dependent) |-->






## The Standard Library (post `std::ranges::`)

C++20 is when *ranges* actually became a thing, and the entire machinery including concepts and algorithms became part of the standard library.
But the significant new features that were introduced are *range adaptors*.
Range adaptors are ranges that are created on top of other ranges,[^range_adaptor_def] typically exposing a subset of the underlying range or a transformation thereof.
See my [previous post]({{< ref "30 - range_intro.md" >}} "previous post") for an introduction.

```cpp
std::vector vec{1, 2, 3, 4};
auto v = vec | std::views::VIEW1 | std::views::VIEW2; // non-owning multi-pass range adaptor
```

This is what a typical "pipeline" looks like. It creates `v` which is a range adaptor on `vec`, applying the transformations implied by `VIEW1` and `VIEW2` (which could e.g. be "take first two elements" and "add 1 to each").

[^range_adaptor_def]: There is some ambiguity as to whether "range adaptor" refers to the returned type (e.g. specialisations of `std::ranges::reverse_view<>`) or the thing that creates the type (e.g. `std::views::reverse`) or both. I use "range adaptor" to refer to the type and "range adaptor object" to refer to the object used in a pipeline. The same ambiguity exists for "view", as will be discussed later.


### Views in range-v3 and original C++20

<center>

![](/post/2025/04/diagram.svg#center "A diagram showing borrowed ranges as a subset of views which in turn are a subset of all ranges.")

</center>

The standard library ranges design is based on the [range-v3 library](https://github.com/ericniebler/range-v3) by Eric Niebler.
In this design, range adaptors are ***views***.

(Range-v3-)***Views*** are defined as ranges that are copyable in *O(1)*.
This is a definition for "non-owning", but it is not as strict as for *borrowed ranges*, because, while the range is not allowed to own the elements, it is allowed to contain *some* state (e.g. a transforming functor).
Borrowed ranges are thus a subset of views.[^subset]

[^subset]: If one follows the standard very literally, borrowed ranges are not required to not have any state. However, since a borrowed range's iterators are copyable in *O(1)* and they are completely independent of the range, one could simply take the iterators and make a new range out of them (that would then be copyable in *O(1)*).

I will discuss below whether this additional flexibility is worth it, but it should be noted that—so far—the definition of view is still clear and only relates to ownership.
It is not identical with "range adaptor", though, because range-v3 and early C++20 already contain standalone ranges that are also called *view*, e.g. `std::ranges::iota_view` and `std::ranges::empty_view`.
The defining criterion is "copyable in *O(1)*".

### Views post P2415

Just before C++20 landed, the committee accepted [P1456](https://wg21.link/p1456) which allowed views to be move-only[^next], and and then **after** C++20 was released, [P2325](https://wg21.link/p2325) was applied as a defect report to C++20 which allows views to not be default-constructible.
I will discuss both of these in the next blog post.

However, the most important (and controversial) change came by way of [P2415](https://wg21.link/p2415), which allowed views to become owning ranges. It was also applied to C++20 as a defect report, although it was quite a significant design change.

```cpp
auto to_upper = [] (unsigned char c) { return std::toupper(c); };
std::string s = "foobar";

/* this has always been possible; v_indiri depends on s */
auto v_indiri = s | std::views::transform(to_upper);

/* this is "new"; v_owning is standalone */
auto v_owning = std::move(s) | std::views::transform(to_upper);
```

This is a useful feature, however, it resulted in the view concept being changed to where it no longer means "non-owning range".
Now, nobody knows what the concept really means, and you won't see it being used anywhere outside of standard library internals.[^concepts]

[^concepts]: Eric Niebler, the father of C++ Ranges, once said: *»Generic Programming pro tip: Although Concepts are constraints on types, you don't find them by looking at the types in your system. You find them by studying the algorithms.«* I don't think anyone is writing algorithms that constrain on the view concept anymore. This suggests that the view concept is not useful. And that the discussed change was not backported into range-v3 could be indicator that Eric Niebler is not happy about it.

There are a lot of (im-)practical implications from this change,[^next] but I consider the lack of clarity in regard to what a view is, as the core problem of C++ ranges.
It makes taking about almost all aspects much more difficult than needed.

In fact, **I suggest avoiding the term "view" altogether.**
* Use "range adaptor" to describe range types that operate on (or wrap) other ranges.
* Use "range adaptor object" to describe the objects that can be chained in pipelines to create "range adaptors".
* Use "non-owning range" to denote a range that is copyable in O(1).
* Use "borrowed range" to denote a range that is copyable in O(1) and where the iterators can outlive the range.


## The RADR library

I have just made public my own experimental ranges library:

<center>

**📡 https://github.com/h-2/radr 📡**

</center>


Please check it out and provide feedback! I will only cover the design choices regarding ownership in this post, but more blog posts will follow. And there is extensive documentation in the `docs` folder of the github repo.

### Non-owning range adaptors

All non-owning (multi-pass) range adaptors in `radr` are borrowed ranges.
This means that all functionality is implemented in terms of the iterator-sentinel-pair, and that the ranges store no further state.
The cost of this is an increase in iterator size, but it dramatically reduces overall complexity and provides a much simpler mental model to users:
 * We have one concept of "non-owning range", not two. The view concept is entirely irrelevant in our library.
 * The "borrowed range" definition is both the strongest and the most useful "non-owning range" definition.
 * If you put a borrowed range into our range pipelines, you always get a borrowed range out (this is not true for `std::`).

While I do believe that "borrowed range" is superior to even the old view concept, being able to avoid the latter entirely was a major motivation for making `radr`.

 ```cpp
std::vector vec{-1, 2, -3, 1, 7};
auto non_neg = [] (int i) { return i >= 0; };

auto it1 = std::ranges::min_element(vec | std::views::filter(non_neg));
// assert(*it == 1);   // broken, because filter_view is never borrowed

auto it2 = std::ranges::min_element(std::ref(vec) | radr::filter(non_neg));
assert(*it == 1);      // works, because all our borrowed range adaptors are
```

<center>

*This example highlights one of the practical advantages of this design choice.*

</center>

This next blog posts will illustrate some more advantages (and also tradeoffs) of this design.
But I want to stress here that this is not novel. In fact, with Boost's range-v2 employing a similar design, one could claim that this is the old or original behaviour.

<p style="text-align: right;">

*“Why do you go away? So that you can come back. So that you can see the place you came from with new eyes and extra colors. […] Coming back to where you started is not the same as never leaving.”* —  Terry Pratchett, A Hat Full of Sky

</p>

In other areas, `radr` and Boost's range-v2 are quite different, though 🙃



### Owning range adaptors




TODO
