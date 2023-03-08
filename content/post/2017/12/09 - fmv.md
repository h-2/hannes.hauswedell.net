---

author: h2
date: 2017-12-09 18:00:00+02:00

title: The - surprisingly limited - usefulness of function multiversioning in GCC
slug: 09/fmv

fsfe_commentid: 3
gh_commentid: 3
tweetid: 940600556451717126
tootid: 99166608238390890

<!-- draft: true -->

toc: true

categories:
- Programming
- cplusplus

tags:
- cplusplus
- gcc
- function multiversioning
- function multi-versioning
- function-multi-versioning
- fmv
- popcount

---

Modern CPUs have quite a few features that generic amd64/intel64 code cannot make use of, simply because they are not
available everywhere and including them would break the code on unsupporting platforms. The solution is to not use
these features, or ship different specialised binaries for different target CPUs. The problem with the first approach
is that you miss out on possible optimisations and the problem with the second approach is that most users don't know
which features their CPUs support, possibly picking a wrong executable (which won't run → bad user experience) or a less
optimised one (which is again problem 1). **But** there is an elegant GCC-specific alternative: Function multiversioning!

<!--more-->

But does it really solve our problems? Let's have a closer look!

## Prerequisites

  * basic understanding of C++ and compiler optimisations (you should have heard of "inlining" before, but you don't
  need to know assembler, in fact I am not an assembly expert either)
  * Most code snippets are demonstrated via [Compiler Explorer](https://gcc.godbolt.org/), but the benchmarks require
  you to have GCC ≥ version 7 locally installed.
  * You might want to open a second tab or window to display the Compiler Explorer along side this post (two screens
  work best 😎).

## Population counts

Many of the CPU features used in machine-optimised code relate to [SIMD](https://en.wikipedia.org/wiki/SIMD), but for
our example, I will use a more simple operation: population count or short **popcount**.

The popcount of an integral number is the number of bits that are set to 1 in its bit-representation.
[More details on [Wikipedia](https://en.wikipedia.org/wiki/Hamming_weight) if you are interested.]

Popcounts are used in many algorithms, and are important in bioinformatics (one of the reasons I am writing this post).
You could implement a naive popcount by iterating over the bits, but GCC already has us covered with a "builtin",
called `__builtin_popcountll` (the "ll" in the end is for `long long`, i.e. 64bit integers). Here's an example:

```cpp
  __builtin_popcountll(6ull) // == 2, because 6ull's bit repr. is `...00000110`
```

To get a feeling for how slow/fast this function is, we are going to call it a billion times. The golden rule
of optimisation is to **always measure** and not make wild assumptions about what you think the compiler or
the CPU is/isn't doing!

```cpp
  #include <cstdint>

  uint64_t pc(uint64_t const v)
  {
      return __builtin_popcountll(v);
  }

  int main()
  {
      for (uint64_t i = 0; i < 1'000'000'000; ++i)
          volatile uint64_t ret = pc(i);
  }
```

<center><a href="https://gcc.godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(j:1,source:'%23include+%3Ccstdint%3E%0A%0Auint64_t+pc(uint64_t+const+v)%0A%7B%0A++++return+__builtin_popcountll(v)%3B%0A%7D%0A%0Aint+main()%0A%7B%0A++++for+(uint64_t+i+%3D+0%3B+i+%3C+1!'000!'000!'000%3B+%2B%2Bi)%0A++++++++volatile+uint64_t+ret+%3D+pc(i)%3B%0A%7D'),l:'5',n:'0',o:'C%2B%2B+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:compiler,i:(compiler:g72,filters:(b:'0',binary:'1',commentOnly:'0',demangle:'0',directives:'0',execute:'1',intel:'0',trim:'0'),libs:!(),options:'',source:1),l:'5',n:'0',o:'x86-64+gcc+7.2+(Editor+%231,+Compiler+%231)',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4" target="_blank">
view in compiler explorer</a></center>

This code should should be fairly easy to understand, the volatile modifier is only used to make sure
that this code is always generated (if not used the compiler will see that the return values are not actually
used and optimise **all the code** away!). In any case, before you compile this locally, click on the link
and check out the compiler explorer. Using the colour code you can easily see that our call to `__builtin_popcountll`
in line 5 is translated to another function `__popcountdi2` internally. Before you continue, add `-03` to the
compiler arguments in compiler explorer, this will add machine-independent optimisations. The assembly code should
change, but you will still be able to find `__popcountdi2`.

This is a generic function that works on all amd64/intel64 platforms and counts the set bits. What does it actually do?
You can search the net and find explanations that say it does some bit-shifting and table-lookups, but the important
part is that it performs **multiple operations** to compute the popcount in a generic way.

Modern CPUs, however, have a feature that does popcount in hardware (or close). Again, we don't need to know
exactly how this works, but we would expect that this single operation function is better than
anything we can do (for very large bit-vectors this is [not true entirely](http://0x80.pl/articles/sse-popcount.html),
but that's a different issue).

How do we use this magic builtin? Just go back to the compiler explorer, and add `-mpopcnt` to the compiler flags,
this tells GCC to expect this feature from the hardware and optimise for it.
Voila, the assembly code generated now resolves to `popcnt rsi, rsi` instead of `call __popcountdi2` (GCC is smart
and it's builtin resolves to whatever is best on the architecture we are targeting).

But how much better is this actually? Compile both versions locally and measure, e.g. with the `time` command.

<center>

| compiler flags | time on my pc   |
|----------------|--------:|
| `-O3`          |    3.1s |
| `-O3 -mpopcnt` |    0.6s |

</center>

A speed-up of 5x, nice!

<center>

![](/post/2017/12/happy.png)

</center>

But what happens when the binary is run on a CPU that doesn't have builtin popcnt?
The program crashes with "Illegal hardware instruction" 💀


## Function multiversioning

This is where function multiversioning ("FMV") comes to the rescue. It is a GCC specific feature, that inserts
a branching point in place of our original function and then dispatches to one of the available "clones"
**at run-time**. You can specify how many of these "clones" you want and for which features or architectures each are
built, then the dispatching function chooses the most highly optimised automatically.
You can even manually write different function bodies for the different clones, but we will focus on the simpler kind of
FMV where you just compile the same function body with different optimisation strategies.

Enough of the talking, here is our adapted example from above:

```cpp
  #include <cstdint>

  __attribute__((target_clones("default", "popcnt")))
  uint64_t pc(uint64_t const v)
  {
      return __builtin_popcountll(v);
  }

  int main()
  {
      for (uint64_t i = 0; i < 1'000'000'000; ++i)
          volatile uint64_t ret = pc(i);
  }
```

<center><a href="https://gcc.godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(j:1,source:'%23include+%3Ccstdint%3E%0A%0A__attribute__((target_clones(%22default%22,+%22popcnt%22)))%0Auint64_t+pc(uint64_t+const+v)%0A%7B%0A++++return+__builtin_popcountll(v)%3B%0A%7D%0A%0Aint+main()%0A%7B%0A++++for+(uint64_t+i+%3D+0%3B+i+%3C+1!'000!'000!'000%3B+%2B%2Bi)%0A++++++++volatile+uint64_t+ret+%3D+pc(i)%3B%0A%7D'),l:'5',n:'0',o:'C%2B%2B+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:compiler,i:(compiler:g72,filters:(b:'0',binary:'1',commentOnly:'0',demangle:'0',directives:'0',execute:'1',intel:'0',trim:'0'),libs:!(),options:'-O3',source:1),l:'5',n:'0',o:'x86-64+gcc+7.2+(Editor+%231,+Compiler+%231)',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4" target="_blank">
view in compiler explorer</a></center>

The only difference is that line 3 was inserted.
The syntax is quite straight-forward insofar as anything in the C++ world is straight-forward 😉 :

  * We are telling GCC that we want two clones for the targets "default" and "popcnt".
  * Everything else gets taken care of.

Follow the link to compiler explorer and check the assembly code (please make sure that you are **not** specifying
`-mpopcnt`!). It is a little longer, but we immediately see
via the colour code of `__builtin_popcountll(v)` that two functions are generated, one with the generic version and
one with optimised version, similar to what we had above, but now in one program. The "function signatures" in the
assembly code also tell us that one of them is "the original" and one is "popcnt clone". Some further analysis will
reveal a third function, the "clone .resolver" which is the dispatching function. Even without knowing any assembly
you might be able to pick out the statement that looks up the CPU feature and calls the correct clone.

Great! So we have a single binary that is as fast as possible **and** works on older hardware. But is it really as
fast as possible? Compile and run it!

<center>

| version  | compiler flags | time on my pc   |
|----------|----------------|--------:|
| original | `-O3`          |    3.1s |
| original | `-O3 -mpopcnt` |    0.6s |
| FMV      | `-O3 `         |    2.2s |

</center>

Ok, we are faster than the original generic code so we are probably using the optimised popcount call, but
we are nowhere near our 5x speed-up. What's going on?

<center>

![](/post/2017/12/hm.png)

</center>

## Nested function calls

We have replaced the core of our computation, the function `pc()` with a dispatcher that chooses the
best implementation. As noted above this decision happens at run-time (it has to, because we can't know
beforehand if the target CPU will support native popcount, it's the whole point of the exercise),
**but now this happens one billion times!**

Wow, this check seems to be more expensive than the actual popcount call. If you write a lot of optimised code, this won't
be a surprise, decision making at run-time just is very expensive.

What can we do about it? Well, we could decide between generic VS optimised *before* running our algorithm, instead
of deciding *in our algorithm* on every iteration:


```cpp
  #include <cstdint>

  uint64_t pc(uint64_t const v)
  {
      return __builtin_popcountll(v);
  }

  __attribute__((target_clones("default", "popcnt")))
  void loop()
  {
      for (uint64_t i = 0; i < 1'000'000'000; ++i)
          volatile uint64_t ret = pc(i);
  }

  int main()
  {
      loop();
  }
```
<center><a href="https://gcc.godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(j:1,source:'%23include+%3Ccstdint%3E%0A%0Auint64_t+pc(uint64_t+const+v)%0A%7B%0A++++return+__builtin_popcountll(v)%3B%0A%7D%0A%0A__attribute__((target_clones(%22default%22,+%22popcnt%22)))%0Avoid+loop()%0A%7B%0A++++for+(uint64_t+i+%3D+0%3B+i+%3C+1!'000!'000!'000%3B+%2B%2Bi)%0A++++++++volatile+uint64_t+ret+%3D+pc(i)%3B%0A%7D%0A%0Aint+main()%0A%7B%0A++++loop()%3B%0A%7D'),l:'5',n:'0',o:'C%2B%2B+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:compiler,i:(compiler:g72,filters:(b:'0',binary:'1',commentOnly:'0',demangle:'0',directives:'0',execute:'1',intel:'0',trim:'0'),libs:!(),options:'-O3',source:1),l:'5',n:'0',o:'x86-64+gcc+7.2+(Editor+%231,+Compiler+%231)',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4" target="_blank">
view in compiler explorer</a></center>

The assembly of this gets a little more messy, but you can follow around the `jmp` instructions or just scan
the assembly for our above mentioned instructions and you will see that we still have the two versions (although
the actual `pc()` function is not called, because it was inlined and is moved around a bit).

Compile the code and measure the time:

<center>

| version      | compiler flags | time on my pc   |
|--------------|----------------|--------:|
| original     | `-O3`          |    3.1s |
| original     | `-O3 -mpopcnt` |    0.6s |
| FMVed `pc()` | `-O3 `         |    2.2s |
| FMVed loop   | `-O3 `         |    0.6s |

</center>

Hurray, we are back to our original speed-up!

If you expected this, than you likely have dealt with strongly templated code before and also heard
of [tag-dispatching](https://arne-mertz.de/2016/10/tag-dispatch/), a technique that can be used to translate
arbitrary run-time decisions to different code-paths beneath which you can treat your run-time decision
as a compile-time one.

Our simplified callgraph for the above cases looks like this (the dotted line is where the dispatching takes place):

<center>

![](/post/2017/12/graph.png)

</center>

In real world code the graph is of course bigger, but it should become obvious that by moving
the decision making further to the left, the code becomes faster – because we have to decide less
often –, but also the size of the generated executable becomes larger – because more functions
are actually compiled. [There are corner cases where the executable being bigger actually results
in certain things becoming slower, but lets not get into that now.]

Anyway, *I thought* that FMV would be like dispatching a tag down the call-graph, **but it's not!**
In fact we just got lucky in our above example, because the `pc()` call was inlined.
[Inlining](https://en.wikipedia.org/wiki/Inline_expansion) means that the function itself is
optimised away entirely and its code is inserted at the place in the
calling function where the function call would have been otherwise. **Only because `pc()` is
inlined, do we actually get the opimisation!**

How do you know? Well you can force GCC to not inline `pc()`:

```cpp
  #include <cstdint>

  __attribute__((noinline))
  uint64_t pc(uint64_t const v)
  {
      return __builtin_popcountll(v);
  }

  __attribute__((target_clones("default", "popcnt")))
  void loop()
  {
      for (uint64_t i = 0; i < 1'000'000'000; ++i)
          volatile uint64_t ret = pc(i);
  }

  int main()
  {
      loop();
  }
```
<center><a href="https://gcc.godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(j:1,source:'%23include+%3Ccstdint%3E%0A%0A__attribute__((noinline))%0Auint64_t+pc(uint64_t+const+v)%0A%7B%0A++++return+__builtin_popcountll(v)%3B%0A%7D%0A%0A__attribute__((target_clones(%22default%22,+%22popcnt%22)))%0Avoid+loop()%0A%7B%0A++++for+(uint64_t+i+%3D+0%3B+i+%3C+1!'000!'000!'000%3B+%2B%2Bi)%0A++++++++volatile+uint64_t+ret+%3D+pc(i)%3B%0A%7D%0A%0Aint+main()%0A%7B%0A++++loop()%3B%0A%7D'),l:'5',n:'0',o:'C%2B%2B+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:compiler,i:(compiler:g72,filters:(b:'0',binary:'1',commentOnly:'0',demangle:'0',directives:'0',execute:'1',intel:'0',trim:'0'),libs:!(),options:'-O3',source:1),l:'5',n:'0',o:'x86-64+gcc+7.2+(Editor+%231,+Compiler+%231)',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4" target="_blank">
view in compiler explorer</a></center>

Just add the third line to your previous Compiler Explorer window, or open the above link. You can
see that the optimised `popcnt` call has disappeared from the assembly and `pc()` only
appears once. So in fact our callgraph is (no optimised `pc()` contained):

<center>

![](/post/2017/12/graph2.png)

</center>

But how serious is this, you may ask? Didn't the compiler inline automatically?
Well, the problem about inlining is, that it is entirely
up to the compiler whether it inlines a function or not (prefixing the function with `inline`
does in fact not force it to). The deeper the call-graph gets, the more
likely it is for the compiler not to inline all the way from the FMV invocation point.

## Trying to save FMV for our use case

<details style='border:1px solid; padding: 2px; margin: 2px'>
  <summary><i>click to see some more complex but futile attempts</i></summary>

It's possible to force the compiler to use inlining, but it's also non-standard
and it obviously doesn't work if the called functions are not customisable by us
(e.g. stable interfaces or external code / a library).
Furthermore it might not even be desirable to force inline every function / function template,
because they might be used in other places or with differently typed arguments
resulting in an even higher increase of executable size.

An alternative to inlining would be to use the original form of FMV where you actually
have different function bodies and in those add a custom layer of (tag-)dispatching yourself:

```cpp
  #include <cstdint>

  template <bool is_optimised>
  __attribute__((noinline))
  uint64_t pc(uint64_t const v)
  {
      return __builtin_popcountll(v);
  }

  __attribute__((target("default")))
  void loop()
  {
      for (uint64_t i = 0; i < 1'000'000'000; ++i)
          volatile uint64_t ret = pc<false>(i);
  }

  __attribute__((target("popcnt")))
  void loop()
  {
      for (uint64_t i = 0; i < 1'000'000'000; ++i)
          volatile uint64_t ret = pc<true>(i);
  }

  int main()
  {
      loop();
  }
```

<center><a href="https://gcc.godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(j:1,source:'%23include+%3Ccstdint%3E%0A%0Atemplate+%3Cbool+is_optimised%3E%0A__attribute__((noinline))%0Auint64_t+pc(uint64_t+const+v)%0A%7B%0A++++return+__builtin_popcountll(v)%3B%0A%7D%0A%0A__attribute__((target(%22default%22)))%0Avoid+loop()%0A%7B%0A++++for+(uint64_t+i+%3D+0%3B+i+%3C+1!'000!'000!'000%3B+%2B%2Bi)%0A++++++++volatile+uint64_t+ret+%3D+pc%3Cfalse%3E(i)%3B%0A%7D%0A%0A__attribute__((target(%22popcnt%22)))%0Avoid+loop()%0A%7B%0A++++for+(uint64_t+i+%3D+0%3B+i+%3C+1!'000!'000!'000%3B+%2B%2Bi)%0A++++++++volatile+uint64_t+ret+%3D+pc%3Ctrue%3E(i)%3B%0A%7D%0A%0Aint+main()%0A%7B%0A++++loop()%3B%0A%7D'),l:'5',n:'0',o:'C%2B%2B+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:compiler,i:(compiler:g72,filters:(b:'0',binary:'1',commentOnly:'0',demangle:'0',directives:'0',execute:'1',intel:'0',trim:'0'),libs:!(),options:'-O1',source:1),l:'5',n:'0',o:'x86-64+gcc+7.2+(Editor+%231,+Compiler+%231)',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4" target="_blank">
view in compiler explorer</a></center>

In this code example we have turned `pc()` into a function template, customisable by a bool variable. This
means that two versions of this function can be instantiated. We then also implement the loops separately and
make each pass a different bool value to `pc()` as a template argument. If you look at the assembly in compiler
explorer you can see that two functions are created for `pc()`, but unfortunately they both contain the
unoptimised popcount call¹. This is due to the compiler not knowing/assuming that one of the functions is only called in an
optimised context. → This method won't solve our problem.

And while it is of course possible to add C++17's `if constexpr` to `pc()` and start hacking custom code into the
the function depending on the template parameter, it does further complicate the solution moving us further
and further away from our original goal of a thin dispatching layer.

<small>¹ Since the resulting function bodies are the same they are actually merged into a single one at optimisation levels > 1 (but this
is independent of our problem).</small>
</details>

## Summary

* Function multiversioning is a good thing, because it aims to solve an actual problem:
delivering optimised binary code to users that can't or don't want to build themselves.
* Unfortunately it does not multiversion the functions called by a versioned function,
forcing developers to move FMV very close to the intended function call.
* This has the drawback of invoking the dispatch much more often than theoretically
needed, possibly incurring a penalty in run-time that might exceed the gain from
more highly optimised code.
* It would be great if GCC developers could address this by adding a version of FMV
that recursively clones the indirectly invoked functions (without further branching),
as well as providing the machine-aware context to these clones, i.e. the presumed CPU features.

## Further reading

On popcnt and CPU specific features:

  * [Overview of CPU specific features and support in GCC](https://gcc.gnu.org/onlinedocs/gcc-4.9.4/gcc/i386-and-x86-64-Options.html#i386-and-x86-64-Options)
  * [Different popcount implementations benchmark](http://0x80.pl/articles/sse-popcount.html)

On FMV:

  * A good article on LWN: https://lwn.net/Articles/691932/
  * The GCC wiki with more details: https://gcc.gnu.org/wiki/FunctionMultiVersioning
