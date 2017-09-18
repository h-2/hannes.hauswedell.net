---
author: h2
comments: true
date: 2016-01-15 16:17:30+00:00

link: /post/2016/01/15/openbsd-on-the-thinkpad-x250/
slug: openbsd-on-the-thinkpad-x250
title: OpenBSD on the Thinkpad X250
wordpress_id: 384
categories:
- (Free) Software
---

Since posts like these often helped me setup some device, I thought I'd write one as well this time. Also it is advertising for a good free operating system.
<!-- more -->


## TL;DR


[![](/post/2016/01/snap1-1024x576.jpg)](/post/2016/01/snap1.jpeg)

Everything works almost perfectly, good hardware, good software! You should give it a try :)


## Hardware


I have got a fairly high-end config:



	
  * Intel® Core™ i7-5600U

	
  * 16GB RAM

	
  * 1920x1080 Display, non-glare, non-touch

	
  * 512GB Samsung SSD

	
  * Intel LAN + WLAN

	
  * Pro-Dock




## Installing OpenBSD


You need a current OpenBSD snapshot (or 5.9 once it is released).



	
  1. get the [install58.fs](//ftp.spline.de/pub/OpenBSD/5.8/amd64/install58.fs) from a server near you, dd it to a USB-Stick and boot from it

	
  2. follow the instructions on the screen to install 5.8

	
  3. get the [bsd.rd](//ftp.spline.de/pub/OpenBSD/snapshots/amd64/bsd.rd) from a current snapshot and place it in `/` (maybe backup the existing one)

	
  4. reboot into it (enter `boot bsd.rd` at the bootloader prompt)

	
  5. follow the intructions on the screen to update to the 5.9-snapshot

	
  6. after you have rebooted into 5.9, run `sysmerge`


Et voila, you are on a current branch of OpenBSD. You should have seen the virtual console resize after the update to the new version.


## BIOS


The BIOS has some useful settings, you might want to make, e.g. switching
`Fn` and `lCtrl` buttons and switching the meaning of the F*-keys to be F*-keys by default and not "media keys". Unfortunately deactivating the keypad from the BIOS does not work ( it can however be deactivated by software, see below).


## Xorg and periphals


No `xorg.conf` nor any configuration like that is needed to bring up X since the new Intel driver takes care of everything. 3D acceleration works, however the direct rendering devices come with write access only given to root. It's probably a security "feature", but it prevents 3D for regular users so I created
`/etc/rc.local` (this is run on startup) with:

    
    #!/bin/sh
    /bin/chmod g+rw /dev/drm*


You should have setup the keyboard to your local layout during install, but if
you haven't done so or want to deactivate dead keys you can edit `/etc/kbdtype`, e.g. to `de.nodead`. This affects both the console and Xorg. Inside Xorg the "media buttons" for display brightness and sound work automatically.

To deactivate the mouse touchpad and make scrolling working with the pointer in combination with the middle mouse button, I have added the following to my `.xinitrc/.xsession`:

    
    # deactivate touchpad
    synclient TouchpadOff=1
    
    # activate scroll wheel button
    xinput set-prop "/dev/wsmouse" "WS Pointer Wheel Emulation" 1
    xinput set-prop "/dev/wsmouse" "WS Pointer Wheel Emulation Axes" 6 7 4 5
    xinput set-prop "/dev/wsmouse" "WS Pointer Wheel Emulation Button" 2
    xinput set-prop "/dev/wsmouse" "WS Pointer Wheel Emulation Timeout" 50
    xinput set-prop "/dev/wsmouse" "WS Pointer Wheel Emulation Inertia" 3
    
    # increase pointer speed
    xinput set-prop "/dev/wsmouse" "Device Accel Constant Deceleration" 0.4


I have to note though that the Pointer Wheel Emulation does not work satisfactory, there is often some jitter and then scrolling stops working. Also the increased sensitivity produces very slight ghost movements of the mouse (very small, but noticable movements of the mouse in the bottom left direction). I still need to debug this, maybe its also a hardware issue.

_UPDATE: I was experiencing more problems with the keyboard, including the space bar not working reliably, so I had the hardware checked resulting in a replacement for the keyboard. After this, all problems related to the mouse disappeared, as well, so I am pretty sure it was actually a hardware issue.
But I also updated to a more recent snapshot so maybe the mouse problems were software related. In any case they are gone now._

The dock seems to work (charging and on/off), although I have not yet tested hooking up external input devices or screens.


## Networking


Both lan and wlan devices come with working drivers and the firmware for the wifi card is automatically downloaded upon install. It should be noted that OpenBSD does not have a service for managing networks and that it implements WPA[2] PSK inside its regular networking infrastructure (it doesn't need wpa_supplicant). For enterprise WPA (like _eduroam_) however, wpa_supplicant is needed.

I have fiddled around with some solutions and ended up adapting a [script](/post/2016/01/wifinwid.txt). The original is [wifinwid](http://foad2.obtuse.com/beck/wifinwid), but I changed it so that it restarts wpa_supplicant before trying every network and also only starts dhclient after it has attached to a network. This solution requires a file at `/usr/local/etc/nwids.iwm0` with your saved networks in preferred order (every line is the arguments line for the ifconfig call), e.g.:

    
    nwid MYSSID -wpa wpa wpaakms psk wpakey SECRETYO up
    nwid eduroam -wpa wpa wpaakms 802.1x up


For the "enterprise" WPA networks like eduroam you have to additionally edit `/etc/wpa_supplicant.conf` (but not for other WPA networks!). The exact values are the same as for other operating systems, see e.g. [this site](//www.kariliq.nl/openbsd/eduroam-uva.html). You do however need to add a `wpa_supplicant_flags=-c /etc/wpa_supplicant.conf -D openbsd -i iwm0` line `/etc/rc.conf.local`.

Ultimately you have make the script be started on boottime and also initially make it not connect to some random unencrypted network via `/etc/hostname.iwm0`:

    
    nwid NONEXISTANT
    rtsol
    !/usr/local/sbin/wifinwid \$if &


Now you have the behaviour that it only ever connects to known networks and that you can roam between different known networks, encrypted or unencrypted, PSK or with personal authentication.


## Powermanagement


You need to activate the APM-daemon in your rc.conf.local:

    
    apmd_flags="-A"
    apmd_enable="YES"


This enables speed-stepping and also suspend and resume. I have tested the `zzz` command (suspend to RAM), but not yet `ZZZ` (suspend to disk). There seem to be no problems at all with X and the wifi also automatically reconnects if setup like above.

Brightness control works through keyboard shortcuts and the battery time seems to be good, although I haven't done long-term tests, yet. With the large battery official number is "up to 20 hours", if I get 12 hours that would be enough for me. A nice thing is that the notebook has an internal battery so you can change the external one without rebooting. The estimation of the remaining time via `apm` or `sysctl` seems to be accurate and my windows manager i3's infobar supports these sensors automatically.


## Summary


Altogether I am very happy about the hardware support, with the only annoyance being the mouse (which is not crucial, because I work more via keyboard anyway). Thanks to all the involved developers! I will probably update this post in the near future, once I have more things tested!
