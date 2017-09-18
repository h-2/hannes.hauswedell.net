---
author: h2
comments: false
date: 2012-11-29 10:33:30+00:00

link: /post/2012/11/29/tracking-memory-usage/
slug: tracking-memory-usage
title: Tracking memory usage
wordpress_id: 147
categories:
- Random Nerdiness
tags:
- bioinformatics
- FreeBSD
- GNU/Linux
- shell
---

... or why using Linux can be a pain, when you come from the BSD-world. <!-- more -->

On BSD (and MacOSX and probable other UNIXes), if you want to track a program's memory usage, you can simply issue the following in a CSHELL
`set time= ( 0 "%D KB avg / %K KB total / %M KB max" )`
or just use [/usr/bin/time's l-parameter](http://www.freebsd.org/cgi/man.cgi?query=time).

On GNU/Linux on the other hand, rusage as defined by POSIX is not completely implemented, so you cannot do this. A workaround is preloading /lib/libmemusage.so which plugs into your program's memory allocation, keeps track of stuff and prints funky statistics in the end.

That's of course better than nothing, but it does create extra overhead, and especially the huge amount of colored (sic!) output that is added to your program's stderr really comes in unhandy if you are working on a benchmarking infrastructure and have program pipelines, where you want stdout and stderr preserved.

Thankfully I found a [different approach](https://github.com/caseywdunn/agalma/blob/master/src/memusage.c), that also hooks into the program by preloading a library, but not interfering with all the memory allocations. It uses /proc-fs on Linux to also get the maximum resident set memory of a process just before it terminates and prints this.

I changed it to print to the fourth file descriptor instead of stderr, so the output can be processed seperately. And I made output more easily parsable.

Then I wrote a wrapper script that you can pass your command call, and it will execute it (preserving stdout and stderr) and print the total run-time and the maximum resident set memory usage of your process (or a sub-process spawned by it) to FD4.

Here are the files:
· [mymemusage.c](/post/2012/11/mymemusage.c)
· [wrapper.sh](/post/2012/11/wrapper_sh.txt)

I might adapt it to detect, if it is running on *BSD and then do the easy way (right now this will only work on Linux).

The only situation where this doesn't work, is where your process spawns multiple processes in parallel and you want the maximum memory usage of the group. Then again, I think there is no solution for this that doesn't involve polling /proc regularly for your process groups current memory usage and summing that up... Luckily parallelization is done mostly by threads nowadays.

