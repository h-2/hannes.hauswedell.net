---

author: h2
date: 2019-06-24 00:15:00+02:00

title: "A good firewall for a small network"
slug: 24/firewall

fsfe_commentid: 5
gh_commentid: 5
tweetid: 1143170236675440640
tootid: 102327131742058456

<!-- draft: true -->

toc: true

categories:
- random-nerdiness
- free-software

tags:
- random-nerdiness
- free-software
- freebsd
- opnsense
- hardenedbsd
- firewall
- unix

---

In this article I will outline the setup of my (not so) new firewall at home.
I explain how I decided which hardware to get and which software to choose, and I cover the entire process of assembling the machine and installing the operating system.
Hopefully this will be helpful to poeple in similar situations.

<!--more-->

# Introduction

![](/post/2019/06/fire.png#center)

While the ability of firewalls to protect against all the evils of the internets
is certainly exaggerated, there are some important use cases for them: you want to prevent certain inbound
traffic and manipulate certain outbound traffic e.g. route it through a VPN.

For a long time I used my home server (whose main purpose is network attached storage) to also do
some basic routing and VPN, but this had a couple of important drawbacks:

 * Just one NIC on the server meant traffic to/from the internet wasn't physically
   required to go through the server.
 * Less reliable due to more complex setup → longer downtimes during upgrades, higher chance of failure due
   to hard drives.
 * I wouldn't give someone else the root password to my data storage, but I did want my flat-mates to be
   able to reset and configure basic network components that they depend on (Router/Port-forwarding and WiFi).
 * I wanted to isolate the ISP-provided router more strongly from the LAN as they have a history of security
   vulnerabilities.

The different off-the-shelf routers I had used over the years had also worked only so-so (even those that were customisable) so I decided I needed a proper router.
Since WiFi access was already out-sourced to dedicated devices I really only needed a filtering and routing device.

# Hardware

## Board & CPU

![](/post/2019/06/mainboard_small.png#center)

The central requirements for the device were:

  * low energy consumption
  * enough CPU power to route traffic at Gbit-speed, run Tor and OpenVPN (we don't have Gbit/s internet in Berlin, yet, but I still have hopes for the future)
  * hardware crypto support to unburden the CPU for crypto tasks
  * two NICs, one for the LAN and one for the WAN

I briefly thought about getting an ARM-based embedded board, but most reviews suggested that the performance
wouldn't be enough to satisfy my requirements and also the *BSD support was mixed at best and I didn't want
to rule out running OpenBSD or FreeBSD.

Back to x86-land: I had previously used [PC Engines](https://pcengines.ch/) ALIX boards as routers and
was really happy with them at the time.
Their new APU boards promised better performance, but thanks to the valuable feedback and some benchmarking
done by the community over at [BSDForen.de](https://bsdforen.de), I came to the conclusion that they wouldn't
be able to push more than 200Mbit/s through an OpenVPN tunnel.

In the end I decided on the [Gigabyte J3455N-D3H](https://www.amazon.de/dp/B071R4P6QG/?tag=fsfe-21) displayed at the top.
It sports a rather atypical Intel CPU
([Celeron J3455](https://ark.intel.com/content/www/us/en/ark/products/95594/intel-celeron-processor-j3455-2m-cache-up-to-2-3-ghz.html)) with

  * four physical cores @ 1.5Ghz
  * AESNI support
  * 10W TDP

Having four actual cores (instead of 2 cores + hyper threading) is pretty cool now that many security-minded
operating systems have started deactivating hyper threading to mitigate CPU bugs
[[OpenBSD](https://www.mail-archive.com/source-changes@openbsd.org/msg99141.html)]
[[HardenedBSD](https://hardenedbsd.org/article/op/2018-12-17/stable-release-hardenedbsd-stable-12-stable-v1200058)].
And the power consumption is also quite low.

I would have liked for the two NICs on the mainboard to be from Intel, but I couldn't find a mainboard at the time that offered this (other than super-expensive SuperMicro boards).
At least the driver support on modern Realteks is quite good.

## Storage & Memory

The board has two memory slots and supports a maximum of 4GiB each.
I decided 4GiB are enough for now and gave it one module to allow for future extensions (I know that's
suboptimal for speed).

Storage-wise I originally planned on putting a left-over SATA-SSD into the case, but in the end, I decided
a tiny USB3-Stick would provide sufficient performance and be much easier to replace/debug/...

## Case & Power

![](/post/2019/06/case1.png#center)

Since I installed a real 19" wrack in my new flat, of course the case for the firewall would have to fit
nicely into that.
I had a surprisingly difficult time finding a good case, because I wanted one were the board's ports
would be front-facing.
That seems to be quite a rare requirement, although I really don't understand why.
Obviously having the network ports, serial ports and USB-Ports to the front makes changing the setup and
debugging so much easier `¯\_(ツ)_/¯`

I also couldn't find a good power supply for such a low-power device, but I still had a 60W PicoPSU supply lying around.

Even though it came with an overpowered PSU and a proprietary IO-Shield (more on that below), I decided on the SuperMicro [SC505-203B](https://www.supermicro.com/products/chassis/1u/505/SC505-203B).
It really does look quite good, I have to say!

## Assembly

![](/post/2019/06/cut1.png#center)

Mounting the mainboard in the case is pretty straight-forward.
The biggest issue was the aforementioned proprietary I/O-Shield that came with the SuperMicro case (and was
designed only for SuperMicro-boards).
It was possible to remove it, however, the resulting open space did not conform to ATX spec
so it wasn't possible to just fit the Gigabyte board's shield into it.

![](/post/2019/06/cut2.png#center)

I quickly took the measurements and starting cutting away on the shield to make it fit.
This worked ok-ish in the end, but is more dangerous than it looks (be smarter than me, wear gloves ☝ ).
In retrospect I also recommend that you do not remove the bottom fold on the shield, only left, right and top;
that will make it hold a lot better in the case opening.

![](/post/2019/06/assembled.png#center)

The board can be fit into the case using standard screws in the designated places.
As mentioned above, I removed the original (actively cooled) power supply unit and used the 60W PicoPSU that I had lying around from before.
Since it doesn't have the 4-pin CPU cable I had improvise. There are adaptors for this, but if you have a left-over power supply, you can also tape together something.
I also put the transformer into the case (duck-tape, yeah!) so that one can plug in the power cord from the back of the case as usual.

# Software

[![OPNSense logo](/post/2019/06/opnsense.png#center)](https://opnsense.org/)

## Choice

There are many operating systems I could have chosen since I decided to use an x86 platform.
My criteria were:

  * free software (obviously)
  * intuitive web user interface to do at least the basic things
  * possibility to login via SSH if things don't go as planned
  * OpenVPN client

I feel better with operating systems based on [FreeBSD](https://www.freebsd.org/) or [OpenBSD](https://www.openbsd.org/), mainly because I have more experience with them than with GNU/Linux distributions nowadays.
In previous flats I had also used [OpenWRT](https://openwrt.org/) and [dd-wrt](https://dd-wrt.com/) based routers, but whenever I needed to tweak something beyond what the web interface offered, it got really painful.
In general the whole IPtables based stack on Linux seems overly complicated, but maybe that's just me.

In any case, there are no OpenBSD-based router operating systems with web interfaces (that I am aware of) so I had the choice between

  1. [pfsense](https://www.pfsense.org/) ([FreeBSD](https://www.freebsd.org/)-based)
  2. [OPNSense](https://opnsense.org/), fork of pfsense, based on [HardenedBSD](https://hardenedbsd.org/) / [FreeBSD](https://www.freebsd.org/)

There seem to be historic tensions between the people involved in both operating systems and I couldn't find out if there were actual distinctions in the goals of the projects.
In the end, I asked other people for recommendations and found the interface and feature list of OPNSense more convincing.
Also, being based on HardenedBSD sounds good (although I am not sure if HardenedBSD-specifica will really ever play out on the router).

Initially I had some issues with the install and OPNSense people were super-friendly and responded immediately. Also the interface was a lot better than I expected so I am quite sure I made the right decision.

## Install

Setup is very easy:

  1. Go to https://opnsense.org/download/, select `amd64` and `nano` and download the image.
  2. Unzip the image (easy to forget this).
  3. Write the image to the USB-stick with `dd` (as always with `dd`: **be careful about the target device!**)
  4. Optionally plug a serial cable into the top serial port (the mainboard has two) and connect your Laptop/Desktop with baud rate 115200
  5. Plug the USB-stick into the firewall and boot it up.

There will be some beeping when you start the firewall. Some of this is due to the mainboard complaining that no keyboard is attached (can be ignored) and also OPNSense will play a melody when it is booted.
If you are attached to the serial console you can select which interface will be WAN and which will be LAN (and their IP addresses).
Otherwise you might need to plug around the LAN cables a bit to find out which is configured as which.

<small><i> When I built this last year there were some more issues, but all of them have been resolved by the OPNSense people so it really is "plug'n'play"; I verified by doing a re-install!</i></small>

## Post-install

![](/post/2019/06/opnsense_login.png#center)

Go to the configured IP-address (`192.168.1.1` by default) and login (`root`: `opnsense` by default).
If the web-interface comes up everything has worked fine and you can disconnect serial console and do the rest via the web-interface.

After login, I would to the following:

  * change the password
  * activate SSH on the LAN interface
  * configure internet access and DHCP
  * setup any of the other services you want

For me setting up the internet meant doing a "double-NAT" with the ISP-provided router, because I need its modem and nowadays it seems impossible to get a stand-alone VDSL modem. If you do something similar just configure internet as being over DHCP.

If you want hardware accelerated SSL (also OpenVPN), go to `System → Firmware → Setting` and change the firmware flavour to `OpenSSL` (instead of `LibreSSL`). After that check for updates and upgrade.
In the OpenVPN profile, under `Hardware Crypto`, you can now select `Intel RDRAND engine - RAND`.

![](/post/2019/06/opnsense_dashboard.png#center)

Take your time to look through the interface! I found some pretty cool things like automatic backup of the configuration to a nextcloud server! The entire config of the firewall rests in one file so it's really easy to setup a clean system from scratch.

All-in-all I am very happy with the system. Even though my setup is non-trivial, with only selected outgoing traffic going through the VPN (based on rules), I never had to get my hands dirty on the command line – everything can be done through the Web-UI.
