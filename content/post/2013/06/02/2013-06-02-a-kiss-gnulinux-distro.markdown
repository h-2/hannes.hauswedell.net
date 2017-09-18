---
author: h2
comments: true
date: 2013-06-02 21:31:13+00:00

link: /post/2013/06/02/a-kiss-gnulinux-distro/
slug: a-kiss-gnulinux-distro
title: A KISS GNU/Linux distro?
wordpress_id: 256
categories:
- (Free) Software
---

As most of you know, I use FreeBSD as my main Desktop-OS. But I also keep a ArchLinux around that I use (almost exclusively) for gaming. After being disappointed with the way it is headed since a while already, I am now completely fed up with it and am desperately seeking an alternative. <!-- more -->


[rant]ArchLinux claims to keep it simple, but over the last year or two it has accumulated an increasing about of bloatware, especially all the stuff that Lennart Poettering is spewing out. Yes, I am conservative in a lot of techie ways, I am a little biased, as I heard lots of bad things about the software before actually using it, **but** I did give all the stuff a fair try and it just failed epicly. For PulseAudio I was at least able to replace it with OSSv4, which had proper support on ArchLinux at the time. Not really proper, as some programs stopped producing audio (e.g. Chromium), but at least all the gaming stuff worked.
Then came systemd and it really is worse then everything I heard about it. Upgrading to systemd severely broke my system (I would never have switched, had I not been forced to by Arch), it took me a countless number of hours to make it boot again. But it is still really broken, and not broken, in the "I need to find the right config"-way, but in the "Let's roll the dice"-Windows way were everything is unpredictable. First of all one in three boots fails, because systemd messes up the order of the nfs-mounts. OSS now has some weirdness as well, where it sometimes just doesn't work and restarting the computer makes it work again. Shutting down the system actually never works, because on shutting down, it again messes up the order of nfs unmounts and never manages to stop OSS (the things actually _spawns jobs_ to stop other processes, see the irony?!). But the biggest issues is that after a random amount of minutes systemd or logind or whatever is responsible for logins just crashes, throwing me unto a console, which asks me to enter my root password or press Ctrl-D to continue and where my keyboard doesn't work anymore (apparently that is handled by the same stuff). Wild button-pressing sometimes retuns me back to X, which then seems to just keep on working, with the exception of an ocasional flicker. And of course -- thanks to systemd -- there is nothing logged anywhere in any form that I can read...
Really, most sysadmins I know warned me about the unreliability of systemd, but I didn't expect it to be that bad. And all of it just to boot one second faster. The GNU/Linux desktop has really fallen far IMHO and I seriously doubt that the whole concept of making everything more integrated and removing modularity and other core unix concepts will help the Free Software movement in the end. Where we win people with some eye-candy and a faster boot, we will alienate more because the software becomes unstable, unreliable and unpredictable. **Rebooting should never be the fix to a problem!** [/rant]


Ok, back to topic, do you know a GNU/Linux Distro that adheres to keep-it-simple philosophy, does not use Poettering-Ware and has a somewhat recent Xorg? 

I thought about switching back to Debian, but they seem to be going the Poettering-road as well, as [recent polls](http://people.debian.org/~stapelberg/2013/05/27/systemd-survey-results.html) indicate. [Draco GNU/Linux](http://www.dracolinux.org/) was my first idea, since they use OSSv4 as default and lots of BSD-stuff, but the Xorg available is quite old, and the projects future is a little unkown... Slackware was my next idea, but it doesn't even include my default window manager ("awesome").
What are your thoughts on this? Any suggestions?
