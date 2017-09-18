---
author: h2
comments: false
date: 2013-04-20 18:48:32+00:00

link: /post/2013/04/20/howto-dual-boot-ubuntu-arm-and-cm10-1-on-the-tf700t/
slug: howto-dual-boot-ubuntu-arm-and-cm10-1-on-the-tf700t
title: 'HowTo: Dual-Boot Ubuntu [arm] and CM10.1 on the TF700t'
wordpress_id: 219
categories:
- (Free) Software
---

I thought I'd cover how I got to my current dual-boot on my Transformer. The main difference to other setups is, that my Transformer's data partition is encrypted, which makes some steps more difficult.<!-- more -->




## The Goal



After following these instructions you will have a regular dual-boot on the transformer, like on any notebook or desktop, i.e. when booting the device you get to select which OS to start. The Android experience is in no way diminished, everything works as before. The Ubuntu experience is just like you would have on a notebook, with RAM being the only limiting factor and some rough edges. Wifi and (proprietary) 3d- and video-acceleration work. Unity works, although I use awesome wm, as everywhere else.
The rough edges are missing suspend support, some rendering glitches here and there, no VTs... for more info, see the [XDA-thread of the port](http://forum.xda-developers.com/showthread.php?t=2014759). This is also the place, in case anything described here doesn't work.



## Preperation



You should know what I am talking about in the following. If not you should probably get to know your device better, before doing this.

What you need:
· Unlocked Transformer TF700t, with CyanogenMod 10.x, stock Android 4.1.x or CleanRom 4.1.x [yes, CM-Versions of Android 4.2 work, others don't]
·· if the transformer is not yet encrypted, do this now (through Settings->Security)
· one dedicated µSD-Card with at least 10GB. I would recommend at least class 10, better UHS1 to get decent performance, as Ubuntu will reside on this. You can get the latter for 22€ these days... ["SD1"]
· a second µSD-Card with 1GiB free space ["SD2"]
· a µSD to SD-Converter (you get these free with µSDs usually)

Get the following files and put them on SD2
· [Kernel/Bootloader](http://goo.im/devs/rabits/tf700/linux-install-0.8.3.zip)
· [Ubuntu RootFS](http://goo.im/devs/rabits/tf700/linux-install-0.8.3.zip)
· A current [CM-Nightly](http://get.cm/?device=tf700t) without the boot-blob inside (just open the zip and remove the boot-blob)



## Action



1. Make backups of your data. Just in case.
2. Put SD2 into the µSD-Slot of the transformer and SD1 into the converter and into the SD-Slot of the transformer.
3. Reboot the transformer into Recovery and select the "linux-install-*.zip" as Update
4. Follow the on-screen instructions, selecting the Dock-SD-Card (SD1) as target
5. After you are done, reboot into Ubuntu, see if it works.
6. Reboot again, into CM, see that it doesn't work (loading and loading).
7. Reboot into Recovery again, install the prepared CM-update (without the boot-blob, or you will overwrite the loader!)
8. Reboot into CM, and see if it works (will still take longer to load on first load)
9. Switch the SD-Cards to have the Dock's reader free again.
10. be happy



## Open Ends



As mentioned, there are still some issues, the main one for me being, that I have not yet successfully decrypted the android data partition from Ubuntu, which I would like to share as home directory. But altogether I am quite happy to have a proper OS, whenever I need to do serious things :) Here's a screenshot:

[![](/post/2013/04/screen-300x187.jpg)](/post/2013/04/screen.jpg)


