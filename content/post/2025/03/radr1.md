---

author: h2
date: 2025-03-01 22:00:00+00:00

title: Multi-pass and single-pass Ranges in C++ | The RADR library part 1

slug: 18/radr1

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

I see multiple challenges with the current design, that I group into the following three points:

1. Fundamental range properties. What is a range? What is a view?
2. Ranges and `const`.
3. How adaptors capture the underlying range.

I will write a blog post on each of these points and try to address the problems by showing a different experimental library design. This is the first article in the series.

*DISCLAIMER:* I have been using Ranges since a long time and consider myself more knowledgeable than most C++ programmers in this area. However, I am also very aware that several people are into this topic a lot deeper than myself, and it is very possible that there are things I haven't considered.
I would further like to stress that I have the utmost respect for the work that was done to get the current state into the standard, and I do not criticise the committee for re-designing certain aspects of views.
In fact, I have reversed my own position on several problems multiple times, and I am sure I wouldn't have come to the conclusions drawn here without the previous iterations of the design.

## Recap

A quick recap of the range concepts copied from a [previous post]({{< ref "30 - range_intro.md" >}} "previous post").

<details>

<summary>Click to expand</summary>

---

Input ranges have different *strengths* that are realised through more
refined concepts (i.e. types that model a stronger concept, always also model the weaker one):

| Concept                              | Description                                                 |
|--------------------------------------|-------------------------------------------------------------|
| `std::ranges::input_range`           | can be iterated from beginning to end **at least once**     |
| `std::ranges::forward_range`         | can be iterated from beginning to end **multiple times**    |
| `std::ranges::bidirectional_range`   | iterator can also move backwards with `--`                  |
| `std::ranges::random_access_range`   | you can jump to elements **in constant-time** `[]`          |
| `std::ranges::contiguous_range`      | elements are always stored consecutively in memory          |

These concepts are derived directly from the respective concepts on the iterators, i.e. if the iterator of a range models `std::forward_iterator`, than the range is a `std::ranges::forward_range`.

For the well-known containers from the standard library this matrix shows which concepts they model:

|                                    | `std::forward_list` | `std::list` | `std::deque` | `std::vector` |
|------------------------------------|:-------------------:|:-----------:|:------------:|:-------------:|
| `std::ranges::input_range`         | ✅                  | ✅           | ✅            |  ✅             |
| `std::ranges::forward_range`       | ✅                  | ✅           | ✅            |  ✅             |
| `std::ranges::bidirectional_range` |                    | ✅           | ✅            |  ✅             |
| `std::ranges::random_access_range` |                    |             | ✅            |  ✅             |
| `std::ranges::contiguous_range`    |                    |             |              |  ✅             |

---

</details>

The important distinction that this post discusses is between **single-pass ranges** (ranges that model `input_range` but not `forward_range`) and **multi-pass ranges** (those that model `forward_range`).

Note that I am taking some liberty with applying "concepts" (both literal and figurative) introduced in C++20 and later to refer to things from pre C++20.

## Standard library (C++17)

### Multi-pass ranges | containers

Containers are the ranges everybody already used before *Ranges* were a thing.
It is safe to assume that programmers will extrapolate from their experience with containers, even if they are made aware that containers are just a subset of Ranges in C++20 and beyond.
Let's have a look at what those assumptions might be.

**Containers are forward ranges.** This is the core property of being a "multi-pass range".
It guarantees not only being able to iterate over the range multiple time, but also receiving the same elements every time.
This implies that incrementing or dereferencing an iterator into the container *does not change the container* (in an observable way).
But these are not the only guarantees with regard to mutability: calling `.begin()`, `.end()` or one of several other member functions is also guaranteed to not change the container.

<center>

![](/post/2025/03/Ouija_board_1987.jpg#center "Photo by Dialog Center Images via Flickr (cc-by)")

*Iterating over a string by random(?) access.*
</center>

These properties are not surprising, I assume the mental model most people have for "iterator" in the context of containers is that of
an observer object—like the glass that is moved over the letters of an Ouija Board if you are so inclined 🔮🧹🧙
In addition to regular iteration being non-modifying, containers also offer const-iterators through their `.begin() const` and `.end() const` members, i.e. they are *const-iterable*.

**Containers are *regular* types.** [^regular] A `std::regular` type is a type that is default-constructible, copyable and equality-comparable.
None of this is surprising; as the name implies, these are properties most programmers assume by default.
Although the semantics of these operations might also seem obvious, I'd like to list them explicitly here: default-constructed containers are empty, copying a container copies all elements, and equality-comparison compares all elements.

[^regular]: At least containers over regular elements are regular and container over semi-regular elements are semi-regular.

### Multi-pass ranges | non-owning

Not all multi-pass ranges are containers. An example of a type that is not a container is `std::string_view`.
Under the hood, a `std::string_view` is just a pointer and a size. However, when using the data structure, the indirection is invisible, and it behaves almost exactly like a (read-only) container, in fact it is being advertised as a drop-in replacement for `std::string const &`.
All the container properties discussed in the previous section are present in `std::string_view`; with the only difference that copying happens in `O(1)` (because only the pointer and not the elements are copied).

One way of formulating this is that containers are *owning* multi-pass ranges and `string_view` is a *non-owning* multi-pass range.

<center>

<p style="color: {{ .Site.Params.style.lightColor }}; text-shadow: 15px 25px 2px black; font-size: 100px; margin-top: 10px; margin-bottom: 10px; ">C++<p>

*You can imagine a string_view like the shadow of a string. They represent the same content, but one is dependent on the other.*
</center>

**Borrowed ranges:** There are different definitions for "non-owning", but one straight-forward definition is that of a "borrowed range", i.e. a range that "borrows" its state (the elements) from another range. You can use the `std::ranges::borrowed_range` concept to check if a range type is borrowed.
The technical definition of such a range is that its `begin` and `end` are not dependent on the range's own lifetime.
This includes ranges dependent on another range's lifetime (e.g. a `string_view`'s iterators could depend on a `string` object), but it also includes ranges where the iterators are entirely self-contained and can thus survive the range they are created from.[^borrowed_lifetime]

[^borrowed_lifetime]: An example would be a range that produces the value `42` infinitely.

Here's an example:

<!--<div class="two_columns">
<div padding-right=10px>

```cpp
std::string s    = "foobar";

auto        iter = s.begin();

{
    std::string copy = s;
    iter             = copy.begin();
}

std::print("{}", *iter); // 💥
```

This is undefined behaviour, because `iter` depended on the lifetime of `copy` which went out-of-scope.


</div>
<div>

```cpp
std::string      s    = "foobar";
std::string_view v    = s;
auto             iter = v.begin();

{
    std::string_view copy = v;
    iter                  = copy.begin();
}

std::print("{}", *iter); // ✅
```

Here `iter` depends neither on the lifetime of `v` nor of `copy`; it only depends on the lifetime of `s` which is still in-scope.

</div>
</div>-->


<div class="two_columns">
<div>

```cpp
auto it = std::ranges::min_element(
  std::string{"foobar"});
// assert(*it == 'a');
```

*This is does not work, because the string went out-of-scope and its iterators became dangling.*


</div>
<div>

```cpp
auto it = std::ranges::min_element(
  std::string_view{"foobar"});
assert(*it == 'a');
```

*This works, because the `string_view` only points to the static storage of the literal.*

</div>
</div>


### Single-pass ranges

A single-pass range is one that does not offer the multi-pass guarantee, i.e. you may not be able to iterate over it multiple times, or might encounter different elements when you do.
It is not even guaranteed that you can call `.begin()` more than once.
This has further implications, e.g. not even being able to check whether the range is empty, or it having surprising semantics.[^empty]

[^empty]: Calling empty could "use up" your only call of `begin()` when invoking `begin() == end()`. Or calling `begin()` could change the state of the range to where it seems empty, but becomes non-empty afterwards.


TODO image


Conceptionally, a single-pass ranges is more "a machine that produces elements" than "a collection of elements".
And the iterator of such a range is not an "observer object", instead it is part of the machine.
Using it changes the state of the machine—and that of other iterators into the same range.[^spooky]

[^spooky]: This effect can be considered "spooky action at a distance", and is the reason that single-pass iterators in C++≥20 are not required to be copyable anymore. In combination with only one call to `begin()` being allowed, this enforces that only one iterator into a single-pass range exists and underlines how connected range and iterator are (compared to multi-pass ranges).


You can model e.g. input streams, network devices or queues as single-pass ranges.
However, no dedicated single-pass range exists in pre C++20 times.
Few single-pass iterators do, e.g. `std::istream_iterator` which exposes the characters of an input stream.
We could use that to conceptualise an `ifstream_range` in C++17 that is constructed from a filename, holds a `std::ifstream` member (or `unique_ptr` thereof) and where begin and end return `std::istream_iterator`.

Such a range would have fundamentally different properties from the ones we discussed for multi-pass ranges:
  * Iterating has observable side-effects and the range is not const-iterable.
  * Equality comparison is not generally available or has different semantics from multi-pass ranges (comparing elements would change/deplete the input range).
  * The range is not copyable and therefore not regular (this depends on implementation choices).

Whether single-pass ranges are *owning* or not, may seem orthogonal to their single-pass-ed-ness, but a closer look suggests that they probably shouldn't be:[^owning_single_pass] The above mentioned `ifstream_range` is clearly not a `borrowed_range`, because it's iterators refer to the istream held by the range.
It is possible to create a range that stores the single-pass iterators of another range (which would make it "borrowed"), but this provides no value, since you can no longer call begin on the original range. In fact, having move-only single-pass iterators[^spooky] is a way of enforcing that range and iterator stay "close" together.


[^owning_single_pass]: There is even an argument to be made that the entire distinction of owning/non-owning is problematic for single-pass ranges, because it is not clear if a range that generates elements actually "owns" them. Would the `ifstream_range` be considered the owner of the elements or just the stream? Would your assessment change if you store a stringstream vs. an ifstream?


### Summary C++17

|     C++17                   |  multi-pass ranges <br> *owning* | multi-pass ranges <br> *non-owning* |single-pass ranges <br> &nbsp; |
|-----------------------------|:-------------------------:|:-------------------------:|:----------------------:|
| category                    | `forward_range` or better | `forward_range` or better |  `input_range` only    |
| example                     | `std::vector<int>`        | `std::string_view`        | range of `std::istream_iterator`  |
| iterating[^iter] w/o side-effects | yes                       | yes                       | no                     |
| const-iterable              | yes                       | yes                       | no                     |
| default-constructible       | yes                       | yes                       | ?                     |
| copyable                    | yes ❘ `O(n)`              | yes ❘ `O(1)`              | (no)                    |
| equality-comparable         | yes ❘ `O(n)`              | yes ❘ `O(n)`              | no                     |
| borrowed                    | no                        | yes                       | (no)                     |

[^iter]: Calling `begin()` (non-const), dereferencing the returned iterator, and/or incrementing it.

The above table summarises the properties discussed previously. We conclude that multi-pass ranges are a generalisation of containers; their iterators are fairly independent of the range; and that non-owning multi-pass ranges can be defined as "borrowed ranges".

Single-pass ranges, on the other hand, are entirely different beasts that are typically only *made to appear* like a sequence of elements.
They do not share many of the properties of multi-pass ranges.



## Standard library (C++20 and later)

C++20 is when "ranges" actually became a thing, and the entire machinery including concepts and algorithms became part of the standard library.
But the significant new features that were introduced are *range adaptors*.
Range adaptors are ranges that are created on top of other ranges, typically exposing a subset of the underlying range or a transformation thereof.
See my [previous post]({{< ref "30 - range_intro.md" >}} "previous post") for an introduction.

```cpp
std::vector vec{1, 2, 3, 4};
auto v = vec | std::views::VIEW1 | std::views::VIEW2; // non-owning multi-pass range adaptor
```

This is what a typical "pipeline" looks like. It creates `v` which is a range adaptor on `vec`, applying the transformations implied by `VIEW1` and `VIEW2` (which could e.g. be "take first two elements" and "add 1 to each").

### Owning vs non-owning range adaptors

Initially, range adaptors where always non-owning, i.e. when creating one on a container, they would include an indirection to that container and depend on the container's lifetime.
In fact, the `std::ranges::view` concept was originally defined as "non-owning range".[^view]

This was changed after C++20 was released and re-applied to C++20 as a defect-report.[^whatisaview]
Now, range adaptors were allowed to wrap the underlying range and store it.
This allows passing rvalues of containers to range adaptor pipelines:


[^view]: The definition was different from `borrowed_range` in that it prohibited owning the elements, but it did not prohibit storing other state in the range (which `borrowed_range` does prohibit).

[^whatisaview]: See https://wg21.link/p2415.

```cpp
/* v is an owning multi-pass range adaptor */
auto v = std::vector{1, 2, 3, 4} | std::views::VIEW1 | std::views::VIEW2;
```

This is a useful feature, however, it resulted in the view concept being changed to where it no longer means "non-owning range".
Now, nobody knows what the concept really means, and you won't see it being used anywhere outside of standard library internals.[^concepts]
This implies further confusion on what a "view" is and how the term should be used.
**I suggest avoiding it altogether.**
Use "range adaptor" to describe ranges that operate on other ranges.
No concept is required to denote this.


[^concepts]: Eric Niebler, the father of C++ Ranges, once said: *»Generic Programming pro tip: Although Concepts are constraints on types, you don't find them by looking at the types in your system. You find them by studying the algorithms.«* I don't think anyone is writing algorithms that constrain on the view concept anymore. This suggests that the view concept it not useful.


### Properties of range adaptors

The interesting question remains what the properties of C++20 range adaptors are compared to the previously known ranges.


| C++20 range adaptors        |  multi-pass ranges <br> *owning* | multi-pass ranges <br> *non-owning* |single-pass ranges <br> &nbsp; |
|-----------------------------|:-------------------------:|:-------------------------:|:----------------------:|
| category                    | `forward_range` or better | `forward_range` or better |  `input_range` only    |
| example                     | `std::vector{} ❘ std::views::XY` | `vec ❘ std::views::XY`  | `views::istream() ❘ std::views::XY` |
| iterating[^iter] w/o side-effects | it depends          | it depends                | no                     |
| const-iterable              | it depends                | it depends                | no                     |
| default-constructible       | it depends                | no                        | no                     |
| copyable                    | no                        | yes ❘ `O(1)`              | it depends                    |
| equality-comparable         | no                        | no                        | no                     |
| borrowed                    | no                        | it depends                | no                     |

The above table shows the state for C++20 range adaptors, using `std::views::XY` as a placeholder for an adaptor object. Most of these will lead to `std::ranges::owning_view` and `std::ranges::ref_view` being used internally which define many of the properties / restrictions.

While the properties of the single-pass ranges are pretty much as expected,[^sp_copy] the multi-pass range adaptors share only few of the fundamental properties of pre-C++20 ranges and are not even consistent within one category.
There are many oddities around `const` and side-effects; I will discuss this in the next blog post!
<!-- : Although the multi-pass guarantee promises that you get the same elements every time, iterating *can* have non-observable side effects, and this prevents const-iteration on several range adaptors. -->

Here I want to briefly elaborate on the reasons for none of the multi-pass range adaptors being (semi-)regular:
  * **(no) default-construction:** some of the owning range adaptors are, but some of them are not, e.g. `std::ranges::transform_view` with a functor that isn't default-constructible, is also not default-constructible. Almost none of the non-owning range adaptors are default-constructible, because they store a pointer to the underlying range, and not its iterators.[^defaultcon]
  * **(no) copyability:** Owning range adaptors are never copyable, by design. This is a weird artefact of them having been introduced so late, and needing a marker internally to differentiate between "owning views" and "non-owning views".
  * **(no) eq-comparability:** Non-owning range adaptors were initially not made eq-comparable, because the committee thought it would be confusing (compare the elements or the internal pointer?). I am not sure whether owning range adaptors were made consistent with this on purpose or whether it was simply forgotten.

[^sp_copy]: Some single-pass range adaptors are copyable. I have heard this later called a mistake, and I don't think most future single-pass range adaptors will be.

[^defaultcon]: Originally, `ranges::ref_view` was default-constructible, simply storing a `nullptr` by default. However, this meant that the default-constructed range was not an empty range but an invalid one; calling `empty()` resulted in undefined behaviour. If the range instead stored the iterator-sentinel-pair, it would have been possible to have default-construction with well-defined behaviour.

As previously hinted at, the non-owning range adaptors also are not always *borrowed*.
In fact the only way to check whether an adaptor is owning or not, is to check `std::ranges::view<T> && std::copy_constructible<T>`, because, as noted above, owning range adaptors explicitly opt-out of any copyability.

This has suprising implications:

<div class="two_columns">
<div>


```cpp
std::vector vec{-1, 2, -3, 0, 7};
auto non_neg = [] (int i) { return i >= 0; };

auto it = std::ranges::min_element(
    vec | std::views::filter(non_neg));
// assert(*it == 0); // broken
```

*Finds the minimum non-negative element; but doesn't work because filter's iterator is not borrowed.*


</div>
<div>


```cpp
std::vector vec{-1, 2, -3, 0, 7};
auto non_neg = [] (int i) { return i >= 0; };

auto v = vec | std::views::filter(non_neg);
auto it = std::ranges::min_element(v);
assert(*it == 0);
```

*It works when using a temporary.*

</div>
</div>


Note that the example on the left-hand side does work for *some* non-owning range adaptors, but filter is not one of them! I believe that these differences in fundamental properties, and the difficulty to predict them, are a main reason why so many programmers struggle with range adaptors.


## RADR library


I propose a differet library design for range adaptors with the following goals:
* similar feature set and usage patterns as in the standard library
  * e.g. composing in pipeline
* more predictable properties
  * e.g. adaptors on containers should behave more like containers
* simpler concepts
  * e.g. all non-owning adaptors should be borrowed (so we don't need "view")
* simpler types
  * e.g. a subrange of a vector and a subrange of an array should have the same type
  * e.g. multiple "takes" and "drops" should not change the type
* it should be harder to shoot yourself in the foot
  * e.g. reduce dangling references
  * e.g. reduce undefined behaviour


### Properties of range adaptors


| RADR range adaptors         |  multi-pass ranges <br> *owning* | multi-pass ranges <br> *non-owning* |single-pass ranges <br> &nbsp; |
|-----------------------------|:-------------------------:|:-------------------------:|:----------------------:|
| category                    | `forward_range` or better | `forward_range` or better |  `input_range` only    |
| example                     | `std::vector{} ❘ radr::XY`| `std::ref(vec) ❘ radr::XY`| `radr::istream() ❘ radr::XY`   |
| type                        | `radr::owning_rad<…>`     | `radr::borrowing_rad<…>`[^borrorrad]  | `std::generator<…>`    |
| iterating[^iter] w/o side-effects | yes                 | yes                       | no                     |
| const-iterable              | yes                       | yes                       | no                     |
| default-constructible       | yes                       | yes                       | no                     |
| copyable                    | yes ❘ `O(n)`              | yes ❘ `O(1)`              | no                     |
| equality-comparable         | yes ❘ `O(n)`              | yes ❘ `O(n)`              | no                     |
| borrowed                    | no                        | yes                       | no                     |

This is what the property table looks like. It is very similar to the C++17 table, and all categories/columns are consistent within themselves.
There is a single class template[^borrowrad] per column that

[^borrowrad]:


TODO

## La Fin

My attempt at implementing this is now available here:

https://github.com/h-2/radr/

