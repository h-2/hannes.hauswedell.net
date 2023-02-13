---

author: h2
date: 2019-11-30 18:10:00+02:00

title: "A beginner's guide to C++ Ranges and Views."
slug: 30/range_intro

fsfe_commentid: 6
gh_commentid: 6
tweetid: 1200835736498515968
tootid: 103228149746363448

<!-- draft: true -->

toc: true

categories:
- Programming
- cplusplus

tags:
- cplusplus
- ranges
- range-v3
- view

---

C++ Ranges are one of the major new things in C++20 and "views" are a big part of ranges.
This article is a short introduction for programmers that are new to C++ Ranges.

<!--more-->

# Preface

You don't need to have any prior knowledge of C++ Ranges, but you should have basic knowledge of C++ iterators and you should have heard of C++ Concepts before.
There are various resources on C++ Concepts, e.g. [Good Concepts](http://www.stroustrup.com/good_concepts.pdf), [Wikipedia](https://en.wikipedia.org/wiki/Concepts_(C%2B%2B)) (although both contain slightly outdated syntax).

This article is based on library documentation that I wrote for the [SeqAn3 library](https://github.com/seqan/seqan3/).
The original is available [here](http://docs.seqan.de/seqan/3-master-user/tutorial_ranges.html).
There is also beginner's documentation on C++ Concepts [over there](http://docs.seqan.de/seqan/3-master-user/tutorial_concepts.html).

Since none of the large standard libraries ship C++ Ranges right now, you need to use the
[range-v3 library](https://github.com/ericniebler/range-v3/) if you want to try any of this.
If you do, you need to replace the `std::ranges::` prefixes with just `ranges::` and any `std::views::` prefixes
with `ranges::views::`.

# Motivation

Traditionally most generic algorithms in the C++ standard library, like `std::sort`, take a pair of iterators
(e.g. the object returned by `begin()`).
If you want to sort a `std::vector v`, you have to call `std::sort(v.begin(), v.end())` and not `std::sort(v)`.
Why was this design with iterators chosen?
It is more flexible, because it allows e.g.:

  * sorting only all elements after the fifth one:
```cpp
std::sort(v.begin() + 5, v.end())
```
  * using non-standard iterators like reverse iterators (sorts in reverse order):
```cpp
std::sort(v.rbegin(), v.rend());
```
  * combine both (sorts all elements except the last 5 in reverse order):
```cpp
std::sort(v.rbegin() + 5, v.rend());
```

But this interface is less intuitive than just calling `std::sort` on the entity that you wish to sort and
it allows for more mistakes, e.g. mixing two incompatible iterators.
C++20 introduces the notion of *ranges* and provides algorithms that accept such in the namespace `std::ranges::`, e.g.
`std::ranges::sort(v)` now works if `v` is range – and vectors are ranges!

What about the examples that suggest superiority of the iterator-based approach? In C++20 you can do the following:

  * sorting only all elements after the fifth one:
```cpp
std::ranges::sort(std::views::drop(v, 5));
```
  * sorting in reverse order:
```cpp
std::ranges::sort(std::views::reverse(v));
```
  * combine both:
```cpp
std::ranges::sort(std::views::drop(std::views::reverse(v), 5));
```

We will discuss later what `std::views::reverse(v)` does, for now it is enough to understand that it returns something
that appears like a container and that `std::ranges::sort` can sort it.
Later you will see that this approach offers even more flexibility than working with iterators.

# Ranges

*Ranges* are an abstraction of "a collection of items", or "something iterable". The most basic definition
requires only the existence of `begin()` and `end()` on the range.

## Range concepts

There are different ways to classify ranges, the most important one is by the capabilities of its iterator.

Ranges are typically input ranges (they can be read from),
output ranges (they can be written to) or both.
E.g. a `std::vector<int>` is both, but a `std::vector<int> const` would only be an input range.

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

|                                    | `std::forward_list` | `std::list` | `std::deque` | `std::array` | `std::vector` |
|------------------------------------|:-------------------:|:-----------:|:------------:|:------------:|:-------------:|
| `std::ranges::input_range`         | ✅                  | ✅           | ✅            | ✅            | ✅             |
| `std::ranges::forward_range`       | ✅                  | ✅           | ✅            | ✅            | ✅             |
| `std::ranges::bidirectional_range` |                    | ✅           | ✅            | ✅            | ✅             |
| `std::ranges::random_access_range` |                    |             | ✅            | ✅            | ✅             |
| `std::ranges::contiguous_range`    |                    |             |              | ✅            | ✅             |

There are also range concepts that are independent of input or output or one of the above concepts, e.g.
`std::ranges::sized_range` which requires that the size of a range is retrievable by `std::ranges::size()`
(in constant time).

## Storage behaviour

**Containers** are the ranges most well known, they own their elements.
The standard library already provides many containers, see above.

**Views** are ranges that are usually defined on another range and transform the underlying range
via some algorithm or operation.
Views do not own any data beyond their algorithm and the time it takes to construct, destruct or copy them should not
depend on the number of elements they represent. The algorithm is required to be lazy-evaluated so it is feasible to
combine multiple views. More on this below.

The storage behaviour is orthogonal to the range concepts defined by the iterators mentioned above, i.e. you
can have a container that satisfies `std::ranges::random_access_range` (e.g. `std::vector` does, but `std::list`
does not) and you can have views that do so or don't.

# Views

## Lazy-evaluation

A key feature of views is that whatever transformation they apply, they do so at the moment you request an
element, not when the view is created.

```cpp
std::vector vec{1, 2, 3, 4, 5, 6};
auto v = std::views::reverse(vec);
```

Here `v` is a view; creating it neither changes `vec`, nor does `v` store any elements.
The time it takes to construct `v` and its size in memory is independent of the size of `vec`.

```cpp
std::vector vec{1, 2, 3, 4, 5, 6};
auto v = std::views::reverse(vec);
std::cout << *v.begin() << '\n';
```

This will print "6", but the important thing is that resolving the first element of `v` to the last element of `vec`
happens **on-demand**.
This guarantees that views can be used as flexibly as iterators, but it also means that if the view performs an
expensive transformation, it will have to do so repeatedly if the same element is requested multiple times.


## Combinability

You may have wondered why I wrote

```cpp
auto v = std::views::reverse(vec);
```

and not

```cpp
std::views::reverse v{vec};
```

That's because `std::views::reverse` is not the view itself, it's an *adaptor* that takes the underlying range
(in our case the vector) and returns a view object over the vector.
The exact type of this view is hidden behind the `auto` statement.
This has the advantage, that we don't need to worry about the template arguments of the view type, but more importantly
the adaptor has an additional feature: it can be *chained* with other adaptors!

```cpp
std::vector vec{1, 2, 3, 4, 5, 6};
auto v = vec | std::views::reverse | std::views::drop(2);

std::cout << *v.begin() << '\n';
```

What will this print?

<details style='border:1px solid; padding: 2px; margin: 2px'>
  <summary><i>Here is the solution</i></summary>
It will print "4", because "4" is the 0-th element of the reversed string after dropping the first two.
</details>

In the above example the vector is "piped" (similar to the unix command line) into the reverse adaptor and then into
the drop adaptor and a combined view object is returned.
The pipe is just a different notation that improves readability, i.e. `vec | foo | bar(3) | baz(7)` is equivalent to
`baz(bar(foo(vec), 3), 7)`.
Note that accessing the 0th element of the view is still lazy, determining which element it maps to happens at the time
of access.

### Exercise

Create a view on `std::vector vec{1, 2, 3, 4, 5, 6};` that filters out all uneven numbers and squares the
remaining (even) values, i.e.
```cpp
std::vector vec{1, 2, 3, 4, 5, 6};
auto v = vec | // ...?

std::cout << *v.begin() << '\n'; // should print 4
```

To solve this you can use `std::views::transform` and `std::views::filter`.
Both take a invocable as argument, e.g. a lambda expression.
`std::views::transform` applies the lambda on each element in the underlying range and `std::views::filter`
"removes" those elements that its lambda function evaluates to false for.


<details style='border:1px solid; padding: 2px; margin: 2px'>
  <summary><i>Here is the solution</i></summary>

```cpp
std::vector vec{1, 2, 3, 4, 5, 6};
auto v = vec
       | std::views::filter(   [] (auto const i) { return i % 2 == 0; })
       | std::views::transform([] (auto const i) { return i*i; });

std::cout << *v.begin() << '\n'; // prints 4
```
</details>

## View concepts

Views are a specific kind of range that is formalised in the `std::ranges::view` concept.
Every view returned by a view adaptor models this concept, but which other range concepts are modeled by a view?

It depends on the underlying range and also the view itself.
With few exceptions, views don't model more/stronger range concepts than their underlying range (except that they are
always a `std::ranges::view`) and they try to preserve as much of the underlying range's concepts as possible.
For instance the view returned by `std::views::reverse` models `std::ranges::random_access_range` (and weaker concepts)
iff the underlying range also models the respective concept.
It never models `std::ranges::contiguous_range`, because the third element of the view is not located immediately after
the second in memory (but instead before the second).

Perhaps surprising to some, many views also model `std::ranges::output_range` if the underlying range does, i.e. **views
are not read-only**:

```cpp
std::vector vec{1, 2, 3, 4, 5, 6};
auto v = vec | std::views::reverse | std::views::drop(2);

*v.begin() = 42; // now vec == {1, 2, 3, 42, 5, 6 } !!
```

### Exercise

Have a look at the solution to the previous exercise (filter+transform).
Which of the following concepts do you think `v` models?

| Concept                          | yes/no? |
|----------------------------------|:-------:|
| `std::ranges::input_range`         |       |
| `std::ranges::forward_range`       |       |
| `std::ranges::bidirectional_range` |       |
| `std::ranges::random_access_range` |       |
| `std::ranges::contiguous_range`    |       |
|                                    |       |
| `std::ranges::view`                |       |
| `std::ranges::sized_range`         |       |
| `std::ranges::output_range`        |       |

<details style='border:1px solid; padding: 2px; margin: 2px'>
  <summary><i>Here is the solution</i></summary>

| Concept                            | yes/no? |
|------------------------------------|:-------:|
| `std::ranges::input_range`         |   ✅    |
| `std::ranges::forward_range`       |   ✅    |
| `std::ranges::bidirectional_range` |   ✅    |
| `std::ranges::random_access_range` |         |
| `std::ranges::contiguous_range`    |         |
|                                    |         |
| `std::ranges::view`                |   ✅    |
| `std::ranges::sized_range`         |         |
| `std::ranges::output_range`        |         |

The filter does not preserve random-access and therefore not contiguity, because it doesn't "know" which element
of the underlying range is the i-th one in constant time.
It cannot "jump" there, it needs to move through the underlying range element-by-element.
This also means we don't know the size.

The transform view would be able to jump, because it always performs the same operation on every element independently
of each other; and it would also preserve sized-ness because the size remains the same.
In any case, both properties are lost due to the filter.
On the other hand the transform view produces a new element on every access (the result of the multiplication), therefore
`v` is not an output range, you cannot assign values to its elements.
This would have prevented modelling contiguous-range as well – if it hadn't been already by the filter – because
values are created on-demand and are not stored in memory at all.

</details>

Understanding which range concepts "survive" which particular view needs some practice.
For the SeqAn3 library we try to [document this in detail](https://docs.seqan.de/seqan/3-master-user/group__views.html),
I hope we will see something similar on cppreference.com.

# Post scriptum

I am quite busy currently with my PhD thesis, but I plan to publish some smaller articles on ranges and views before
the holiday season.
Most will be based on text pieces I have already written but that never found their way to this blog
(library documentation, WG21 papers, snippets from the thesis, ...).

Thanks for reading, I hope this article was helpful! If you have any questions, please comment here or on
twitter/mastodon.
