---
author: h2
comments: false
date: 2012-12-04 10:52:51+00:00

link: /post/2012/12/04/hacking-encryption-into-android/
slug: hacking-encryption-into-android
title: Hacking encryption into Android
wordpress_id: 158
categories:
- (Free) Software
- Privacy
tags:
- Android
- encryption
- FYA
---

Next weekend we are going to have a small hackathon in Berlin to port/fix/implement disk encryption on various Android devices. <!-- more -->

Android has full disk encryption since 4.0, but it only works when using regular filesystems, e.g. ext. If you have a device that doesn't offer proper block devices, because the hardware doesn't do wear-leveling et cetera, you will probably have YAFFS2 as a file system or something similar that does this on software side. Unfortunately this prevents standard encryption (luks, dm-crypt...) from working. But there is some outdated code floating around that is supposed to implement this, which we will try to update and integrate with current CyanogenMod. More details on the issue can be found [here](http://code.google.com/p/cyanogenmod/issues/detail?id=6685), [here](http://code.google.com/p/freexperia/issues/detail?id=658) and [here](http://code.google.com/p/cyanogenmod/issues/detail?id=5678) (in parts).

Since many phones with hardware keyboards (Xperia Pro, Xperia Mini Pro) are affected, and a lot of hackers have those, maybe you are one of those and want to help! Or maybe you just want to help, which would also really be appreciated. Actually anyone with Android, Java and/or C(++) skills is really welcome!

The hackathon facts:
· 2012.12.08 11:00 ↔ 2012.12.09 18:00
· graciously hosted by [IN-Berlin e.V.](http://in-berlin.de) ([OpenStreetMap](http://osm.org/go/0MZvv6ctT--))

We will have a limited amount of sponsored Club Mate. Other drinks are available for inexpensive purchase. Food will have to find its way to us by delivery. Bring your own phone, bring your own laptop. Hope to see you there!

