---

author: h2
date: 2018-04-11 13:45:00+02:00

title: "Tutorial: Writing your first view from scratch (C++20 / P0789)"
slug: 11/view1

fsfe_commentid: 4
gh_commentid: 4
tweetid: 984047100441825282
tootid: 99840829295499039

<!-- draft: true -->

toc: true

categories:
- Programming
- cplusplus

tags:
- cplusplus
- gcc
- ranges
- range-v3
- view
- concepts

---

C++17 was officially released last year and the work on C++20 quickly took off.
A subset of the Concepts TS was merged and the first part of the Ranges TS has been accepted, too.
Currently the next part of the Ranges TS is under review:
["Range Adaptors and Utilities"](http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/p0789r0.pdf).
It brings the much-hyped "Views" to C++, but maybe you have been using them already via the
[Range-V3 library](https://ericniebler.github.io/range-v3/)?
In any case you might have wondered what you need to do to actually write your own view.
This is the first in a series of blog posts describing complete view implementations (not just adaptations of existing ones).

<!--more-->

# DISCLAIMER 2023-02-27

**This article does not reflect the final state of ranges and views (although nothing about them is really final as
they keep changing even within C++20). It likely does not work with current ranges from the standard libary!**

I might write a new post at some point, but the current one is outdated.

# Introduction (skip this if you have used views before)

Ranges are an abstraction of "a collection of items", or "something iterable".
[The most basic definition](http://en.cppreference.com/w/cpp/experimental/ranges/range/Range) requires only the
existence of begin() and end(), their comparability and begin being incrementable,
but more refined range concepts add more requirements.

The ranges most commonly known are containers, e.g. std::vector.
Containers are types of ranges that *own* the elements in the collection, but in this blog post we are more interested *views*.

What are views?

Views are ranges that usually (but not always!) performs an operation on another range.
They are [lazy-evaluated](https://en.wikipedia.org/wiki/Lazy_evaluation) stateful algorithms on ranges that present their result again as a range.
And they can be chained to combine different algorithms which can be done via the `|` operator like on the UNIX command line.

Ok, sounds cool, what does this mean in practice?

Well, you can, e.g. take a vector of ints, apply a view that computes the square of every element,
and then apply a view that drops the first two elements:

```cpp
 std::vector<int> vec{1, 5, 6, 8, 5};
 auto v = vec | view::transform([] (int const i) { return i*i; }) | view::drop(2);
 std::cout << *std::begin(v) << '\n'; // prints '36'
```

And the point here is that only one "squaring-operation" actually happens and that it happens when we dereference the iterator,
not before (because of lazy evaluation!).

What type is `v`?  It is some implementation defined type that is guaranteed to satisfy certain range concepts:
the [View concept](http://en.cppreference.com/w/cpp/experimental/ranges/range/View) and the
[InputRange concept](http://en.cppreference.com/w/cpp/experimental/ranges/range/InputRange).
The view concept has some important requirements, among them that the type is "light-weight",
i.e. copy'able in constant time. So while views *appear* like containers, they behave more like iterators.

If you are lost already, I recommend you check out some of the following resources

  * [Introduction to the C++ Ranges Library](https://www.fluentcpp.com/2018/02/09/introduction-ranges-library/) on FluentCpp (Blog Post and Video)
  * [Ranges for the Standard Library](https://www.youtube.com/watch?v=mFUXNMfaciE) – CppCon2015 talk by EricNiebler
  * [Range-V3 Documentation](https://ericniebler.github.io/range-v3/)

# Prerequisites

The following sections assume you have a basic understanding of what a view does and have at least tried some of the toy examples yourself.

DISCLAIMER: Although I have been working with views and range-v3 for a while now, I am surprised by things again and again.
If you think I missed something important in this article I would really appreciate feedback!

In general this post is aimed at interested intermediate C++ programmers, I try to be verbose with explanations and also provide many links for
further reading.

You should have a fairly modern compiler to test the code, I test with GCC7 and Clang5 and compile with `-std=c++17 -Wall -Wextra`.

I refer to [constraints and concepts](http://en.cppreference.com/w/cpp/language/constraints) in some of the examples.
These are not
crucial for the implementation so if they are entirely unfamiliar to you, just skip over them. If you use GCC on the
other hand, you can uncomment the respective sections and add `-fconcepts` to your compiler call to activate them.

While the views we are implementing are self-contained and independent of the range-v3 library, you should
[get it now](https://github.com/ericniebler/range-v3/) as some of our checks and examples require it.

And you should be curious of how to make your own view, of course 😄

# Adapting existing views

Our task in this post is to write a view that works on input ranges of `uint64_t` and always adds the number 42,
i.e. we want the following to work:

```cpp
 int main()
 {
     std::vector<uint64_t> in{1, 4, 6, 89, 56, 45, 7};

     for (auto && i : in | view::add_constant)
         std::cout << i << ' ';
     std::cout << '\n'; // should print: 43 46 48 131 98 87 49

     // combine it with other views:
     for (auto && i : in | view::add_constant | ranges::view::take(3))
         std::cout << i << ' ';
     std::cout << '\n'; // should print: 43 46 48
 }
```

Most of the time it will be sufficient to adapt an existing view and whenever this is feasible it is of course recommended.
So the *recommended solution* to the task is to just re-use `ranges::view::transform`:

```cpp
 #include <iostream>
 #include <range/v3/view/transform.hpp>
 #include <range/v3/view/take.hpp>

 namespace view
 {
 auto const add_constant = ranges::view::transform([] (uint64_t const in)
                                                   {
                                                      return in + 42;
                                                   });
 }

 int main()
 {
     std::vector<uint64_t> in{1, 4, 6, 89, 56, 45, 7};

     for (auto && i : in | view::add_constant)
         std::cout << i << ' ';
     std::cout << '\n'; // should print: 43 47 64 131 98 87 49

     // combine it with other views:
     for (auto && i : in | view::add_constant | ranges::view::take(3))
         std::cout << i << ' ';
     std::cout << '\n'; // should print: 43 47 64
 }
```

As you can see, it's very easy to adapt existing views!

But it's not always possible to re-use existing views and the task was to get our hands dirty with writing our own view.
The [official manual](https://ericniebler.github.io/range-v3/#tutorial-quick-start) has some notes on this, but while abstractions
are great for code-reuse in a large library and make the code easier to understand for those that know what lies behind them,
I would argue that they can also obscure the actual implementation for developers new to the code base who need to puzzle together
the different levels of inheritance and template specialisation typical for C++ abstractions.

So in this post we will develop a view that does not depend on range-v3, especially not the internals.

# The components of a view

What is commonly referred to as a view usually consists of multiple entities:

  1. the actual class (template) that meets the requirements of the [View concept](http://en.cppreference.com/w/cpp/experimental/ranges/range/View) and at least also [InputRange concept](http://en.cppreference.com/w/cpp/experimental/ranges/range/InputRange);
  by convention of the range-v3 library it is called `view_foo` for the hypothetical view "foo".
  2. an adaptor type which overloads the `()` and `|` operators that facilitate the "piping" capabilities and *return an instance of 1.*;
  by convention of range-v3 it is called `foo_fn`.
  3. an instance of the adaptor class that is the only user-facing part of the view;
  by convention of range-v3 it is called `foo`, in the namespace `view`, i.e. `view::foo`.

If the view you are creating is just a combination of existing views, you may not need to implement 1. or even 2.,
but we will go through all parts now.

# The actual implementation

## preface

```cpp
#include <range/v3/all.hpp>
#include <iostream>

template <typename t>
using iterator_t = decltype(std::begin(std::declval<t &>()));

template <typename t>
using range_reference_t = decltype(*std::begin(std::declval<t &>()));
```

* As mentionend previously, including range-v3 is optional, we only use it for concept checks – and in production
code you will want to select concrete headers and not "all".
* The `iterator_t` metafunction retrieves the iterator type from a range by checking the return type of `begin()`.
* The `range_reference_t` metafunction retrieves the reference type of a range which is what you get when
dereferencing the iterator. It is only needed in the concept checks. [^1]
[^1]: If you are confused that we are dealing with the "reference type" and not the "value type", remember that member functions like `at()` and `operator[]` on plain old containers also always return the `::reference` type.
* Both of these functions are defined in the range-v3 library, as well, but I have given minimal definitions here
to show that we are not relying on any sophisticated magic somewhere else.

## `view_add_constant`

We start with the first real part of the implementation:

```cpp
template <typename urng_t>
//     requires (bool)ranges::InputRange<urng_t>() &&
//              (bool)ranges::CommonReference<range_reference_t<urng_t>, uint64_t>()
class view_add_constant : public ranges::view_base
{
```
* `view_add_constant` is a class template, because it needs to hold a reference to the underlying range it operates on;
that range's type `urng_t` is passed in a as template parameter.
* If you use GCC, you can add `-fconcepts` and uncomment the requires-block. It enforces certain constraints
on `urng_t`, the most basic constraint being that it is an [InputRange](http://en.cppreference.com/w/cpp/experimental/ranges/range/InputRange).
The second constraint is that the underlying range is actually a range over `uint64_t` (possibly with reference or `const`).
* *Please note* that these constraints are specific to the view we are just creating. Other views will have different requirements
on the reference type or even the range itself (e.g. it could be required to satisfy
[RandomAccessRange](http://en.cppreference.com/w/cpp/experimental/ranges/range/RandomAccessRange)).
* We inherit from `view_base` which is an empty base class, because being derived from it signals to some library checks that this
class is really trying to be a view (which is otherwise difficult to detect sometimes); in our example we could also
omit it.

```cpp
private:
    /* data members == "the state" */
    struct data_members_t
    {
        urng_t urange;
    };
    std::shared_ptr<data_members_t> data_members;
```

* The only data member we have is (the reference to) the original range. It may look like we are saving a value here,
but depending on the actual specialisation of the class template, `urng_t` may also contain `&` or `const &`.
* Why do we put the member variables inside an extra data structure stored in a smart pointer? A requirement of views
is that they be copy-able in constant time, e.g. there should be no expensive operations like allocations during copying.
An easy and good way to achieve implicit sharing of the data members is to put them inside a `shared_ptr`.
Thereby all copies share the data_members and they get deleted with the last copy. [^2]
[^2]: This is slightly different than in range-v3 where views only accept temporaries of other views, not of e.g. containers (containers can only be given as lvalue-references). This enables constant time copying of the view even without implicit sharing of the underlying range, but it mandates a rather complicated set of techniques to tell apart views from other ranges (the time complexity of a function is not encoded in the language so tricks like inheriting ranges::view are used). I find the design used here more flexible and robust.
* In cases where we only hold a reference, this is not strictly required, but in those cases we still benefit from the
fact that storing the reference inside the smart pointer makes our view default-constructible. This is another
requirement of views – and having a top-level reference member prevents this. [Of course you can use a top-level
pointer instead of a reference, but we don't like raw pointers anymore!]
* Other more complex views have more variables or "state" that they might be saving in `data_members`.

```cpp
    /* the iterator type */
    struct iterator_type : iterator_t<urng_t>
    {
        using base = iterator_t<urng_t>;
        using reference = uint64_t;

        iterator_type() = default;
        iterator_type(base const & b) : base{b} {}

        iterator_type operator++(int)
        {
            return static_cast<base&>(*this)++;
        }

        iterator_type & operator++()
        {
            ++static_cast<base&>(*this);
            return (*this);
        }

        reference operator*() const
        {
            return *static_cast<base>(*this) + 42;
        }
    };
```

* Next we define an iterator type. Since `view_add_constant` needs to satisfy basic range requirements,
you need to be able to iterate over it. In our case we can stay close to the original and inherit from the original iterator.
* For the iterator to satisfy the
[InputIterator concept](http://en.cppreference.com/w/cpp/experimental/ranges/iterator/InputIterator) we need to
overload the increment operators so that their return type is of our class
and not the base class. The important overload is that of the dereference operation, i.e. actually getting the value.
This is the place where we interject and call the base class's dereference, but then add the constant 42.
Note that this changes the return type of the operation (`::reference`); it used to be `uint64_t &`
(possibly `uint64_t const &`), now it's `uint64_t` → A new value is always generated as the result of adding `42`.
* *Note* that more complex views might require drastically more complex iterators and it might make sense to define those externally.
In general iterators involve a lot of [boilerplate code](https://en.wikipedia.org/wiki/Boilerplate_code), depending on the scope of your
project it might make sense to add your own iterator base classes. Using [CRTP](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern)
also helps re-use code and reduce "non-functional" overloads.

We continue with the public interface:
```cpp
public:
    /* member type definitions */
    using reference         = uint64_t;
    using const_reference   = uint64_t;
    using value_type        = uint64_t;

    using iterator          = iterator_type;
    using const_iterator    = iterator_type;
```

* First we define the member types that are common for input ranges. Of course our value type is `uint64_t` as we only operate on ranges
over `uint64_t` and we are just adding a number. As we mentioned above, our iterator will always generate new values when dereferenced
so the reference types are also value types.
* *Note:* Other view implementation might be agnostic of the actual value type, e.g. a view that reverses the elements can do so
independent of the type. AND views might also satisfy
[OutputRange](http://en.cppreference.com/w/cpp/experimental/ranges/range/OutputRange), i.e. they allow writing to the
underlying range by passing
through the reference. To achieve this behaviour you would write `using reference = range_reference_t<urng_t>;`.
The value type would then be the reference type with any references stripped
(`using value_type = std::remove_cv_t<std::remove_reference_t<reference>>;`).
* The iterator type is just the type we defined above.
* In general views are not required to be const-iterable, but if they are the `const_iterator` is the same as the `iterator` and
`const_reference` is the same as `reference`. [^3]

[^3]: This might be confusing to wrap your head around, but remember that the `const_iterator` of a container is like an iterator over the `const` version of that container. The same is true for views, except that since the view does not own the elements its own const-ness **does not "protect" the elements from being written to.** Ranges behave similar to iterators in this regard, an `iterator const` on a vector can also be used to write to the value it points to. More on this in [this range-v3 issue](https://github.com/ericniebler/range-v3/issues/385).

```cpp
    /* constructors and deconstructors */
    view_add_constant() = default;
    constexpr view_add_constant(view_add_constant const & rhs) = default;
    constexpr view_add_constant(view_add_constant && rhs) = default;
    constexpr view_add_constant & operator=(view_add_constant const & rhs) = default;
    constexpr view_add_constant & operator=(view_add_constant && rhs) = default;
    ~view_add_constant() = default;

    view_add_constant(urng_t && urange)
        : data_members{new data_members_t{std::forward<urng_t>(urange)}}
    {}
```
* The constructors are pretty much standard. We have an extra constructor that initialises our urange from the value passed in.
Note that this constructor covers all cases of input types (`&`, `const &`, `&&`), because more attributes can be stuck in the
actual `urng_t` and because of [reference collapsing](http://en.cppreference.com/w/cpp/language/reference).

```cpp
    /* begin and end */
    iterator begin() const
    {
        return std::begin(data_members->urange);
    }
    iterator cbegin() const
    {
        return begin();
    }

    auto end() const
    {
        return std::end(data_members->urange);
    }

    auto cend() const
    {
        return end();
    }
};
```
* Finally we add `begin()` and `end()`. Since we added a constructor for this above, we can create our view's iterator
from the underlying range's iterator implicitly when returning from `begin()`.
* For some ranges the sentinel type (the type returned by `end()`) is not the same as the type returned by `begin()`,
this is only true for [BoundedRanges](http://en.cppreference.com/w/cpp/experimental/ranges/range/BoundedRange);
the only requirement is that the types are comparable with `==` and `!=`.
We need to take this into account here, that's why the end function returns `auto` and not the iterator
(the underlying sentinel is still comparable with our new iterator, because it inherits from the underlying range's
iterator).
* As noted above, some views may not be const-iterable, in that case you can omit `cbegin()` and `cend()` and not
mark `begin()` and `end()` as `const`.
* *Note* that if you want your view to be stronger that an
[InputRange](http://en.cppreference.com/w/cpp/experimental/ranges/range/InputRange), e.g. also be a
[SizedRange](http://en.cppreference.com/w/cpp/experimental/ranges/range/SizedRange) or even a
[RandomAccessRange](http://en.cppreference.com/w/cpp/experimental/ranges/range/RandomAccessRange),
you might want to define additional member types (`size_type`, `difference_type`) and additional
member functions (`size()`, `operator[]`...). *Although strictly speaking the range "traits" are now deduced completely
from the range's iterator so you don't *need* additional member functions on the range.*

```cpp
template <typename urng_t>
//     requires (bool)ranges::InputRange<urng_t>() &&
//              (bool)ranges::CommonReference<range_reference_t<urng_t>, uint64_t>()
view_add_constant(urng_t &&) -> view_add_constant<urng_t>;
```
* We add a [user-defined type deduction guide](http://en.cppreference.com/w/cpp/language/class_template_argument_deduction)
 for our view.
* Class template argument deduction enables people to use your class template without having to manually specify the template parameter.
* In C++17 there is automatic deduction, as well, but we need user defined deduction here, if we want to cover both cases
of `urng_t` (value tpye and reference type) and don't want to add more complex constructors.

```cpp
static_assert((bool)ranges::InputRange<view_add_constant<std::vector<uint64_t>>>());
static_assert((bool)ranges::View<view_add_constant<std::vector<uint64_t>>>());
```
* Now is a good time to check whether your class satisfies the concepts it needs to meet, this also works on Clang
without the Concepts TS or C++20. We have picked `std::vector<uint64_t>` as an underlying type, but others would work, too.
* If the checks fail, you have done something wrong somewhere. The compilers don't yet tell you why certain concept
checks fail (especially when using the range library's hacked concept implementation) so you need to add more basic
concept checks and try which ones succeed and which break to get hints on which requirements you are failing. A
likely candidate is your iterator not meeting the
[InputIterator concept](http://en.cppreference.com/w/cpp/experimental/ranges/iterator/InputIterator)
([old, but complete documentation](http://en.cppreference.com/w/cpp/concept/InputIterator)).

## `add_constant_fn`

Off to our second type definition, the functor/adaptor type:

```cpp
struct add_constant_fn
{
    template <typename urng_t>
//         requires (bool)ranges::InputRange<urng_t>() &&
//                  (bool)ranges::CommonReference<range_reference_t<urng_t>, uint64_t>()
    auto operator()(urng_t && urange) const
    {
        return view_add_constant{std::forward<urng_t>(urange)};
    }

    template <typename urng_t>
//         requires (bool)ranges::InputRange<urng_t>() &&
//                  (bool)ranges::CommonReference<range_reference_t<urng_t>, uint64_t>()
    friend auto operator|(urng_t && urange, add_constant_fn const &)
    {
        return view_add_constant{std::forward<urng_t>(urange)};
    }

};
```
* The first operator facilitates something similar to the constructor, it enables traditional usage of the view in
the so called function-style: `auto v = view::add_constant(other_range);`.
* The second operator enables the pipe notation: `auto v = other_range | view::add_constant;`. It needs to be
`friend` or a free function and takes two arguments (both sides of the operation).
* Both operators simply delegate to the constructor of `view_add_constant`.

## `view::add_constant`

Finally we add an instance of the adaptor to namespace `view`:
```cpp
namespace view
{

add_constant_fn constexpr add_constant;

}
```

Since the adapter has no state (in contrast to the view it generates), we can make it `constexpr`. You can now use
the adaptor in the above example.

We are done 😊

Here is the full code: [view_add_constant.cpp](../../view_add_constant.cpp)

# Post scriptum

I will follow up on this with a second tutorial, it will cover writing a view that takes arguments, i.e.

```cpp
std::vector<uint64_t> in{1, 4, 6, 89, 56, 45, 7};
auto v = in | view::add_number(42);
// decide this at run-time     ^
```

If you found mistakes (of which I am sure there are some) or if you have questions, please comment below via GitHub, Gitea, Twitter
or Mastodon!


