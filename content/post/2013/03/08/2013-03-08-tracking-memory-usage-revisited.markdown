---
author: h2
comments: true
date: 2013-03-08 13:36:45+00:00

link: /post/2013/03/08/tracking-memory-usage-revisited/
slug: tracking-memory-usage-revisited
title: Tracking memory usage Revisited
wordpress_id: 170
categories:
- Random Nerdiness
---

I posted an article on tracking memory usage a while ago. Unfortunately it doesn't work for a lot of cases, i.e. when programs are statically linked, or are written in a way where they don't go through the dynamic linker, e.g. programs written in Java. <!-- more -->

I now actually pgrep the child processes of the invoked command and sum up all the processes' resident set memory, as found in /proc, repeatedly, preserving the max. The temporal resolution of this of course depends on the interval at which you measure, but especially on commands executing over a long time this seem to be be very close to VmHWM. I currently check every 300ms.

You can find the script here [here](/post/2013/03/wrapper_new_sh.txt).
