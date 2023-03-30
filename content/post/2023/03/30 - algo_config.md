---

author: h2
date: 2023-03-30 22:00:00+00:00

title: Configuring algorithms in Modern C++

slug: 30/algo_config

fsfe_commentid: 8
gh_commentid: 8
tweetid:
tootid:

<!-- draft: true -->

toc: true

categories:
- Programming
- cplusplus

tags:
- cplusplus
- modern_cpp
- designated_initializers
- CTAD
- named_parameters


---

When designing library code, one often wonders: *"Are these all the parameters this function will ever need?"* and
*"How can a user conveniently change one parameter without specifying the rest?"* This post introduces some Modern C++
techniques you can use to make passing configuration options easy for your users while allowing you to
add more options later on.

<!--more-->

## Prerequisites

Most people who have programmed in C++ before should have no problems understanding this article, although you
will likely appreciate it more, if you are a library developer or have worried about the forward-compatibility of
your code.

Some of the features introduced in this post do not yet work with Clang. Most *should* work with MSVC, but
I only double-checked the code with GCC12 (any version >= 10 should work).

## Motivation

Let's say you are writing an algorithm with the following signature:

```cpp
auto algo(auto data, size_t threads = 4ull);
```

It takes some kind of data input, does lots of magic computation on it and returns some other data. An actual
algorithm should of course clearly state what kind of input data it expects (specific type or constrained template
parameter), but we want to focus on the other parameters in this post.
The only configuration option that you want to expose is the number of threads it shall use. It defaults to `4`,
because you know that the algorithm scales well at four threads and also you assume that most of your users
have at least four cores on their system.

Now, a bit later, you have added an optimisation to the algorithm called `heuristic42`. It improves the results in
almost all cases, but there are a few corner cases where users might want to switch it off. The interface now looks
like this:

```cpp
auto algo(auto data, size_t threads = 4ull, bool heuristic42 = true);
```

This is not too bad, you might think, but there are already two ugly things about this:

1. To overwrite the second "config option", the user needs to also specify the first, i.e. `algo("data", 4, false);`.
This means that they need to look up (and enter correctly) the first config option's default value. Also, if you change
that default in a future release of the code, this change will not be reflected in the user's invocation who
unknowingly enforces the old default.
2. Since passing arguments to the function does not involve the parameter's name, it is very easy to confuse the order
of the parameters. Implicit conversions make this problem even worse, so invoking the above interface with
`algo("data", false, 4);` instead of `algo("data", 4, false);` generates no warning, even with `-Wall -Wextra -pedantic`!

Wow, what a usability nightmare, and we only have two config options! Imagine adding a few more…

## Dedicated config object

As previously mentioned, the parameter name cannot be used when passing arguments. However, C++20 did add
[designated initialisers](https://en.cppreference.com/w/cpp/language/aggregate_initialization#Designated_initializers)
for certain class types.
So you can use the name of a member variable when initialising an object.
We can use that!

```cpp
struct algo_config
{
    bool heuristic42 = true;
    size_t threads   = 4ull;
};

auto algo(auto data, algo_config const & cfg)
{
    /* implementation */
}

int main()
{
    /* create the config object beforehand (e.g. after argument parsing) */
    algo_config cfg{.heuristic42 = false, .threads = 8};
    algo("data", cfg);

    /* create the config object ad-hoc */
    algo("data", algo_config{.heuristic42 = false, .threads = 8});   // set both paramaters
    algo("data", algo_config{.threads = 8});                         // set only one parameter

    /* providing the config type's name is optional */
    algo("data", {.threads = 8});

}
```

<center>
<a href="https://godbolt.org/#z:OYLghAFBqd5QCxAYwPYBMCmBRdBLAF1QCcAaPECAMzwBtMA7AQwFtMQByARg9KtQYEAysib0QXACx8BBAKoBnTAAUAHpwAMvAFYTStJg1DIApACYAQuYukl9ZATwDKjdAGFUtAK4sGe1wAyeAyYAHI%2BAEaYxHoADqgKhE4MHt6%2BcQlJAkEh4SxRMVy2mPaOAkIETMQEqT5%2BRXaYDskVVQQ5YZHRegqV1bXpDX3twZ353VwAlLaoXsTI7BzmAMzByN5YANQmy27IvehYVDvYJhoAgmfnvcReDptiwKgA%2BmgMNMBXJgDsVhebAM2EVQnk2CEwczwvTwyEkZm2ywAIpsCLdMDs/udAZtEgAvTDPAgohDETBMdAKQE7ZGSLy0WgYr7fRGMi5XJheIgPWhPCAcrnoJiVUjcp6vAQfTZvXrbMwANilVGAkyZmOxAHoAFSbPAsWL0NiCIXJTaa9VMllsi7BIksJjBCAqtm/K4a7XIUlCzDE71vSWoCLaJpEqL8UkIQzoTYQTAAOmAsYeVAI0QexGAPkYRNiVUSRkmpvN/0BjxefrwwEVn1%2BsfBkOhsPh1M2VDEShFsYIJLJFIRyIAHD8Wcs1SWeagIOYzILKlORcglSqR19iwCtVLPSmfVKJRXNgGg/dyQBaBCoZCF11j3lTmdMOeisu76sWWsQ4hQxyNvsttuYDtdp6vbNoOzJLhYgLquqOKYCGqBdpsObEKwXrEAoV4AqWk5mNOQr3jhIqluK7wVj8r6AT2lIgUO4HYnR9EMZB0FKESAi0AAnvuISIVUrCwdEK5YpB2qxMQqAAG54PgRjbuWlYEOxsTelC%2B6xGUzC0Jeq6PthuGzgR2w1hR5JUUimygYi4GCUOHDTLQnAAKy8H4HBaKQqCcG41jWDiszzN6Kw8KQBCaLZ0wANYgA5Gj6JwkjOaF7mcLwCggDFIWubZpBwLAMCICgqB6nQ0TkJQaBFfQMTAFwBFYJJCwAGp4JgADuADySkuUFNC0CmaGUBEiURMEVTsZwQXDcwxDsW1gbBuNvDlYaBBtQwHGJVgdpGOImWkPgpLNOJmCpbtmCqE0nKLEFNolIltB4BEyHTR4WCJaiuoLdMVAGMAChNa1HWMAtMiCCIYjsFIIPyEoaiJboRQGEYKDeZY%2BgPalkDTKganJCdx4HNSpiWNYZhuY0zTODGDDuJ4dT%2BNTHR5AUGSJOpAz1KQ8Ss8kjNdIUxSlC0wzsz0JTBkLbS8%2BM/O9G0ItDJLoxMxM0wKH5CwSHZjkJbtHkcJsqj9nKx5ypImzAMgF41bG8IQLghAkLKyxTLwGVaJMEVRTF9kcPFpAsF7pAuW5espWlwWhdMOX5bMBCxJypUQOVsTFcQoR8ZwhvG6b5uW5s1tmLwmD4EQH7oHo/Cg6I4iQ5X0MqOou3w6QLXIbEn2xRwTlB4lettZy8esVQBtGybZsW1bZg29GHgVamgWTK7kfTOC5LdI6nd%2BwH0U97ryW2OHbthaQkU7z7yw6yH%2B9Hx7neF7vV8cEvmW30daHJCAkhAA%3D%3D%3D">Compile and edit online (via godbolt)</a>
</center>

As you can see, this solves both of the problems mentioned previously! We refer to the config elements by name
to avoid mixups, and we can choose to overwrite only those parameters that we actually want to change; other
configuration elements will be whatever they are set to by default.
Conveniently, this allows changing the default later on, and all invocations that don't overwrite it will pick up the
new default.

Another great feature is that the API maintainer of the algorithm can easily add more members to the configuration
object without invalidating any existing invocations.
This allows users of the API to gradually adopt new opt-in features.

As the name of the config type can even be omitted (see last invocation), the syntactic overhead for the "ad-hoc"
initialisation is very low, almost like providing the arguments directly to the function-call.

**There is an important catch:** The order in which the designated initialisers are given has to correspond to the
order in which the respective members are defined in the type of the config.
It is okay to omit initialisers at the beginning, middle or end (as long as defaults are given), but the relative
order of all the initialisers that you do provide has to be correct.
This might sound like a nuisance, but in contrast to the problem discussed initially (mixed up order of function
arguments), you will actually get a compiler-error that tells you that you got the order wrong; so the problem is
easily detected and fixed.
And there is a nice rule that you can follow for such config objects: always sort the members alphabetically! That way users
intuitively know the order and don't have to look it up 💡


## Types as config elements

Now, sometimes you want to pass a type as kind of parameter to an algorithm. Imagine that the algorithm internally
juggles a lot of integers. Maybe it even does [SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data)
with them.
In those cases, the size of the integers could affect performance noticeably.

Some algorithms might be able to infer from the data input's type which integers to use for computation, but
in other cases you want the user to be able to override this.
Thus we need the ability to pass the desired type to the algorithm.
The canonical way of doing this is via template arguments:

```cpp
template <typename int_t>
auto algo(auto data, size_t threads = 4ull);
```

But this is has the same problems that we discussed initially: as soon as multiple types are passed, it is possible
confuse the order (and not be notified); to set a later parameters, you need to also set previous ones; et cetera.
There might also be weird interactions with the type of the data parameter, in case that is a template parameter.

Let's add the "type parameter" to our config object instead:

```cpp
/* We define a "type tag" so we can pass types as values */
template <typename T>
inline constinit std::type_identity<T> ttag{};

/* The config now becomes a template */
template <typename Tint_type = decltype(ttag<uint64_t>)>
struct algo_config
{
    bool heuristic42    = true;
    Tint_type int_type  = ttag<uint64_t>;
    size_t threads      = 4ull;
};

/* And also the algorithm */
template <typename ...Ts>
auto algo(auto data, algo_config<Ts...> const & cfg)
{
    /* implementation */
}

int main()
{
    /* Setting just "value parameters" still works with and without "algo_config" */
    algo("data", algo_config{.heuristic42 = false, .threads = 8});
    algo("data",            {.heuristic42 = false, .threads = 8});

    /* When setting a "type parameter", we need to add "algo_config" */
    algo("data", algo_config{.int_type = ttag<uint32_t>, .threads = 8});
}
```

<center>
<a href="https://godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(filename:'1',fontScale:14,fontUsePx:'0',j:1,lang:c%2B%2B,selection:(endColumn:19,endLineNumber:1,positionColumn:19,positionLineNumber:1,selectionStartColumn:19,selectionStartLineNumber:1,startColumn:19,startLineNumber:1),source:'%23include+%3Ccstdint%3E%0A%23include+%3Ccstddef%3E%0A%23include+%3Ctype_traits%3E%0A%0A/*+We+define+a+%22type+tag%22+so+we+can+pass+types+as+values+*/%0Atemplate+%3Ctypename+T%3E%0Ainline+constinit+std::type_identity%3CT%3E+ttag%7B%7D%3B%0A%0A/*+The+config+now+becomes+a+template+*/%0Atemplate+%3Ctypename+Tint_type+%3D+decltype(ttag%3Cuint64_t%3E)%3E%0Astruct+algo_config%0A%7B%0A++++bool+heuristic42++++%3D+true%3B%0A++++Tint_type+int_type++%3D+ttag%3Cuint64_t%3E%3B%0A++++size_t+threads++++++%3D+4ull%3B%0A%7D%3B%0A%0A/*+And+also+the+algorithm+*/%0Atemplate+%3Ctypename+...Ts%3E%0Aauto+algo(auto+data,+algo_config%3CTs...%3E+const+%26+cfg)%0A%7B%0A++++/*+implementation+*/%0A%7D%0A%0Aint+main()%0A%7B%0A++++/*+Setting+just+%22value+parameters%22+still+works+with+and+without+%22algo_config%22+*/%0A++++algo(%22data%22,+algo_config%7B.heuristic42+%3D+false,+.threads+%3D+8%7D)%3B%0A++++algo(%22data%22,++++++++++++%7B.heuristic42+%3D+false,+.threads+%3D+8%7D)%3B%0A%0A++++/*+When+setting+a+%22type+parameter%22,+we+need+to+add+%22algo_config%22+*/%0A++++algo(%22data%22,+algo_config%7B.int_type+%3D+ttag%3Cuint32_t%3E,+.threads+%3D+8%7D)%3B%0A%7D'),l:'5',n:'0',o:'C%2B%2B+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((g:!((h:compiler,i:(compiler:g122,deviceViewOpen:'1',filters:(b:'0',binary:'1',binaryObject:'1',commentOnly:'0',demangle:'0',directives:'0',execute:'1',intel:'0',libraryCode:'0',trim:'1'),flagsViewOpen:'1',fontScale:14,fontUsePx:'0',j:1,lang:c%2B%2B,libs:!(),options:'-std%3Dc%2B%2B20',selection:(endColumn:1,endLineNumber:1,positionColumn:1,positionLineNumber:1,selectionStartColumn:1,selectionStartLineNumber:1,startColumn:1,startLineNumber:1),source:1),l:'5',n:'0',o:'+x86-64+gcc+12.2+(Editor+%231)',t:'0')),k:50,l:'4',m:50,n:'0',o:'',s:0,t:'0'),(g:!((h:output,i:(compilerName:'x86-64+gcc+12.2',editorid:1,fontScale:14,fontUsePx:'0',j:1,wrap:'1'),l:'5',n:'0',o:'Output+of+x86-64+gcc+12.2+(Compiler+%231)',t:'0')),header:(),l:'4',m:50,n:'0',o:'',s:0,t:'0')),k:50,l:'3',n:'0',o:'',t:'0')),l:'2',n:'0',o:'',t:'0')),version:4">Compile and edit online (via godbolt)</a>
</center>

There are a few things happening here. In the beginning, we use
[variable templates](https://en.cppreference.com/w/cpp/language/variable_template) to define an object
that "stores" a type. This can later be used to initialise members of our config object.

Next, we need to make `algo_config` a template. Unfortunately, we need to default the template parameter
as well as giving the member a default value. Finally, `algo()` needs template parameters for the config, as well.
It is handy to just use a parameter pack here, because it means we don't need to change it if we add more
template parameters the config type.
This is all a bit more verbose than before, after all we are still writing C++ 😅 But most of this will be hidden
from the user anyway.

The invocation of the algorithm is almost unchanged from before, we just use `ttag<uint32_t>` to initialise
the "type parameter" of the config.
There is one caveat: when passing such "type parameters", it is now necessary to add `algo_config`, although,
fortunately, you do not need to spell out the template arguments.
In general, this may be a bit surprising, so I recommend always including the config-name in examples to teach
your users a single syntax.

## Constants as config elements

Using a similar technique to the one above, we can also pass compile-time constants to the config object.
This allows the algorithm to conveniently use `if constexpr` to choose between different codepaths, e.g.
between a SIMD-based codepath and a regular one.

```cpp
/* We define a "value tag" type so we can pass values as types...*/
template <auto v>
struct vtag_t
{
    static constexpr auto value = v;
};

/* ...and then we define a variable template to pass the type as value again! */
template <auto v>
inline constinit vtag_t<v> vtag{};

/* The config is a template */
template <typename Tuse_simd = vtag_t<false>>
struct algo_config
{
    bool heuristic42    = true;
    size_t threads      = 4ull;
    Tuse_simd use_simd  = vtag<false>;
};

/* The algorithm */
template <typename ...Ts>
auto algo(auto data, algo_config<Ts...> const & cfg)
{
    /* implementation */
}

int main()
{
    /* Setting just "value parameters" still works with and without "algo_config" */
    algo("data", algo_config{.heuristic42 = false, .threads = 8});
    algo("data",            {.heuristic42 = false, .threads = 8});

    /* When setting a "constant parameter", we need to add "algo_config" */
    algo("data", algo_config{.threads = 8, .use_simd = vtag<true>});
}
```

<center>
<a href="https://godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(filename:'1',fontScale:14,fontUsePx:'0',j:1,lang:c%2B%2B,selection:(endColumn:29,endLineNumber:37,positionColumn:29,positionLineNumber:37,selectionStartColumn:18,selectionStartLineNumber:37,startColumn:18,startLineNumber:37),source:'%23include+%3Ccstddef%3E%0A%0A/*+We+define+a+%22value+tag%22+type+so+we+can+pass+values+as+types...*/%0Atemplate+%3Cauto+v%3E%0Astruct+vtag_t%0A%7B%0A++++static+constexpr+auto+value+%3D+v%3B%0A%7D%3B%0A%0A/*+...and+then+we+define+a+variable+template+to+pass+the+type+as+value+again!!+*/%0Atemplate+%3Cauto+v%3E%0Ainline+constinit+vtag_t%3Cv%3E+vtag%7B%7D%3B%0A%0A/*+The+config+is+a+template+*/%0Atemplate+%3Ctypename+Tuse_simd+%3D+vtag_t%3Cfalse%3E%3E%0Astruct+algo_config%0A%7B%0A++++bool+heuristic42++++%3D+true%3B%0A++++size_t+threads++++++%3D+4ull%3B%0A++++Tuse_simd+use_simd++%3D+vtag%3Cfalse%3E%3B%0A%7D%3B%0A%0A/*+The+algorithm+*/%0Atemplate+%3Ctypename+...Ts%3E%0Aauto+algo(auto+data,+algo_config%3CTs...%3E+const+%26+cfg)%0A%7B%0A++++/*+implementation+*/%0A%7D%0A%0Aint+main()%0A%7B%0A++++/*+Setting+just+%22value+parameters%22+still+works+with+and+without+%22algo_config%22+*/%0A++++algo(%22data%22,+algo_config%7B.heuristic42+%3D+false,+.threads+%3D+8%7D)%3B%0A++++algo(%22data%22,++++++++++++%7B.heuristic42+%3D+false,+.threads+%3D+8%7D)%3B%0A%0A++++/*+When+setting+a+%22constant+parameter%22,+we+need+to+add+%22algo_config%22+*/%0A++++algo(%22data%22,+algo_config%7B.threads+%3D+8,+.use_simd+%3D+vtag%3Ctrue%3E%7D)%3B%0A%7D'),l:'5',n:'0',o:'C%2B%2B+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((g:!((h:compiler,i:(compiler:g122,deviceViewOpen:'1',filters:(b:'0',binary:'1',binaryObject:'1',commentOnly:'0',demangle:'0',directives:'0',execute:'1',intel:'0',libraryCode:'0',trim:'1'),flagsViewOpen:'1',fontScale:14,fontUsePx:'0',j:1,lang:c%2B%2B,libs:!(),options:'-std%3Dc%2B%2B20',selection:(endColumn:1,endLineNumber:1,positionColumn:1,positionLineNumber:1,selectionStartColumn:1,selectionStartLineNumber:1,startColumn:1,startLineNumber:1),source:1),l:'5',n:'0',o:'+x86-64+gcc+12.2+(Editor+%231)',t:'0')),k:50,l:'4',m:50,n:'0',o:'',s:0,t:'0'),(g:!((h:output,i:(compilerName:'x86-64+gcc+12.2',editorid:1,fontScale:14,fontUsePx:'0',j:1,wrap:'1'),l:'5',n:'0',o:'Output+of+x86-64+gcc+12.2+(Compiler+%231)',t:'0')),header:(),l:'4',m:50,n:'0',o:'',s:0,t:'0')),k:50,l:'3',n:'0',o:'',t:'0')),l:'2',n:'0',o:'',t:'0')),version:4">Compile and edit online (via godbolt)</a>
</center>

As you can see, this is very similar to the previous example. The only difference is, that we need another initial step
to encode the value as a type.
It is even possible to have parameters that are (run-time) values by default, but can be configured as (compile-time)
constants in the way shown above.
And, of course, all kinds of config options can be combined.

Note that the definitions of the "tagging" features would happen in your utility code. Users only need to know
that they can pass constants via `vtag<42>` and types via `ttag<int32_t>`.

## Post scriptum

I hope this post was helpful to some of you. I think this is a big step forward for usability, and I hope Clang
catches up with the required features as soon as possible!

There are two things here that could be improved:

1. If a template parameter can be deduced from member initialisers, it should be. This would allow us to omit
the default template arguments for `algo_config`, i.e. `= decltype(ttag<uint64_t>)` and `= vtag_t<false>`.
2. When a brace-enclosed initialiser list is passed to a function template to initialise a parameter of deduced type,
consider the contents of that initialiser list. This would allow us to omit
`align_config` also when passing "type parameters" or constants.

I have the feeling that 1. might not be too difficult and also not too controversial. But I suspect that 2. would
be more complicated as it interacts with function overloading and I can imagine situations were this change
would break existing code.

But I'd love to here other people's opinion on the matter!

## References

The ISO WG21 papers that added these features to C++:

* [P0329 Designated Initialisers](https://wg21.link/P0329R4), C++20
* [P1816](https://wg21.link/p1816) and [P2082](https://wg21.link/p2082) Class template argument deduction for aggregates, C++20, [not yet in Clang](https://github.com/llvm/llvm-project/issues/50743)

