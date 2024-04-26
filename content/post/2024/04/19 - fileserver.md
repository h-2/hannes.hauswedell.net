---

author: h2
date: 2024-04-19 18:30:00+02:00

#title: My slightly overpowered new fileserver
#title: ZFS NVME Raid with FreeBSD14
title: A FreeBSD fileserver with a ZFS NVME Raid

slug: 19/fileserver

fsfe_commentid: 10
gh_commentid: 10
tweetid:
tootid:

<!-- draft: true -->

toc: true

categories:
- random-nerdiness

tags:
- ZFS
- OpenZFS
- FreeBSD
- NVME
- nvmecontrol
- RAID
- NAS
- Fileserver
- Server
- Nextcloud
- NFS
- 10GBase-T
- 10gbit
- Lexar
- Crucial
- Benchmark


---

I have a small server running in my flat that serves files locally via NFS and remotely via Nextcloud. This post documents
the slightly overpowered upgrade of the hardware and subsequent performance / power optimisations.

<!--more-->

## TL;DR

TODO

## Old setup and requirements

What the server does:

* Serve files via NFS to
  * my workstation (high traffic)
  * a couple of Laptops (low traffic)
  * the TV running Kodi (medium traffic)
* Host a Nextcloud which provides file storage, PIM etc. for a handful of people

Not a lot of compute is necessary, and I have tried to keep power usage low. The old hardware served me well really long:

*  TODO CPU
* 16GiB RAM
* 2+1 * 4TiB spinning disk RAIDZ1 with SSD ZIL ("write-cache")

The main pain point was slow disk access resulting in poor performance when large files were read by the Nextcloud.
Browsing through my photo collection via NFS was also very slow, because thumbnail generation needed to pull all the images.
Furthermore, low speed meant that I was not doing as much on the remote storage as I would have liked (e.g. storing
games), resulting in my workstation's storage always running out.
*And* I was just reaching the limits of my ZFS pool anyway, so it was time for an upgrade!


## New setup

To get better I/O, I thought about switching from HDD to SSD, but then realised that SSD performance is very low compared
to NVME performance, although the price difference is not that much. Also, NFS+ZFS leads to quite a bit of I/O, typically
requiring the use of faster caching devices, further complicating the setup.
Consequently, I decided to go for a pure NVME setup.
Of course, the new server would also need 10GBit networking, so that I can use all that speed in the LAN!

<center>

![](/post/2024/04/stuff.jpg#center "The new hardware.")

</center>

This is the new hardware! I will discuss the details below.


## Mainboard, CPU and RAM

The main requirement for the mainboard is to offer connectivity for four NVME disks. And to be prepared for the future,
I would actually like 1-2 extra NVME slots.
There are two ways to attach NVMEs to a motherboard:

1. directly ("natively")
2. via an extension card that is plugged into a PCIexpress slot

Initially, I had assumed no mainboard would offer sufficient native slots, so I did a lot of research on option 2.
The summery: it is quite messy. If you want to use a single extension card that hosts multiple NVMEs (which is required
in this case), you need so called "bifurcation support" on the mainboard.
This lets you e.g. put a PCIe x8 card with two NVME 4x disks into a PCIe 8x slot on the mainboard.
However, this feature is really poorly documented,[^1] and and varies between mainboard **AND** CPU whether they
support no bifurcation, only 8x → 4x4x or also 16x → 4x4x4x4x.
The different PCIe versions and speeds, and the difference between the actually supported speed and the electrical
interface add further complications.

In the end, I decided to not do any experiments and look for a board that natively supports a high number of NVME slots.
For some reasons, this feature is very rare on AMD mainboards, so I switched to Intel (although actually I am a bit of
an AMD fanboy). I probably could have gone with a board that has 5 slots, but I use hardware for a long time and wanted
to be safe, so I took board that has 6 NVME slots:


<center>

![](/post/2024/04/board2.png#center "ASRock Z790 NOVA WiFi.")

[ASRock Z790 NOVA WiFi](https://geizhals.de/asrock-z790-nova-wifi-90-mxbmb0-a0uayz-a3045663.html)

</center>

None of the available boards had a *proper*[^2] 10GBit network adaptor, so having a usable PCIe slot for a dedicated card
was also a requirement.
It is important to check whether PCIe slots can still be used when all NVME slots are occupied; sometimes they
internally share the bandwidth. But for the above board this is not the case.

**Important:** To be able to boot FreeBSD on this board, you need to add the following to `/boot/device.hints`:

```
hint.uart.0.disabled="1"
hint.uart.1.disabled="1"
```


[^1]: With ASUS being [the only exception](https://www.asus.com/de/support/faq/1037507/).
[^2]: *Proper* in this context means well-supported by FreeBSD and with a good performance.
Usually, that means an Intel NIC. Unfortunately all the modern boards come Marvell/Aquantia AQtion adaptors which
are not well-supported by FreeBSD.

For the CPU, I just went with something on the low TDP end of the current Intel CPU range, the [Intel Core i3-12100T](https://geizhals.de/intel-core-i3-12100t-cm8071504651106-a2660333.html).
Four cores + four threads was exactly what I was looking for, and 35W TDP sounded good.
I paired that with some off-the-shelf [32GiB RAM kit](https://geizhals.de/patriot-viper-venom-dimm-kit-32gb-pvv532g600c36k-a2724586.html).

## Case, power supply & cooling

Strictly speaking a 2U case would have been sufficient, but I thought a 3U case might offer better air circulation.
I ended up with the [Gembird 19CC-3U-01](https://geizhals.de/gembird-19cc-3u-01-a1552078.html).
For unknown reasons, I chose a [2U horizontal CPU fan](https://www.amazon.de/dp/B0BTPH45QS), instead of a 3U one.
The latter would definitely have provided better airflow, but since the fan barely runs at all, it doesn't make much of
a difference.

I was unsuccessful in finding a good PSU that is super efficient in the average case of around 40W power usage but also
covers spikes well above 100W, so I just chose the cheapest 300W one I could get :)


<center>

![](/post/2024/04/case.jpg#center "The case with everything in place.")

*The case with everything in place.*

</center>


The built in fans are very noisy. I chose to replace one of the intake fans with a spare one I had lying around and
only connect one of the rear outtake fans. But I added an extra fan where the extension slots are to divert some
airflow around the NIC—which otherwise gets quite warm. This should also blow some air over the NVME heatsinks!
All fans can be regulated and fine-tuned from the BIOS of the mainboard which I totally recommend you do. At the current
temperatures and average workloads the whole setup is almost silent.


## Storage

Now, the fun begins. Since I needed more space than before, I clearly want a 3+1 x 4TiB RAIDZ1.

My goal was to be able to saturate a 10GBit connection (so get around 1GiB/s throughput) and still
have the server be able to serve the Nextcloud without slowing down significantly. Currently the WAN upload is quite
slow, but I hope to have fibre in the future. In any case, I thought that any modern NVME should be fast enough, because
they all advertise speeds of multiple GiB/s.

### Choice of disks

Anyway, I got two [Crucial P3 Plus 4TB](https://geizhals.de/crucial-p3-plus-ssd-4tb-ct4000p3pssd8-a2761835.html) (which were on sale at Amazon for ~190€), as well as two [Lexar NM790 4TB](https://geizhals.de/lexar-nm790-4tb-lnm790x004t-rnnn-a2980705.html) (which were also a lot cheaper than they are now).
My assumption that that they were very comparable, was very wrong:

<center>

| Disk    | IOPS rand-read | IOPS read  | IOPS write | MB/s read | MB/s write | "cat speed" MB/s |
|---------|---------------:|-----------:|-----------:|----------:|-----------:|-----------------:|
| Crucial |         53,500 |   794,000  |    455,000 |     2,600 |      4,983 |             ~700 |
| Lexar   |         53,700 |   796,000  |    456,000 |     4,578 |      5,737 |           ~2,700 |

</center>

I used [this fellow's fio-script](https://forums.servethehome.com/index.php?threads/nfs-iops-performance-on-freebsd-nvme-storage.30960/) to
generate all columns except the last. The last column was generated by simply cat'ing a 10GiB file of random numbers to `/dev/null` which
roughly corresponds to the read portion of copying a 4k movie file.
Since I had two disks each, I actually took the time to test all of them in different mainboard slots, but the results
were very consistent: in real-life tasks, the Crucial disk underperformed significantly, while the Lexar disks were
super fast.
I decided to return the Crucial disks and get two more by Lexar 😎

### Disk encryption

I always store my data encrypted at rest. FreeBSD offers GELI block-level encryption (similar to LUKS on Linux).
But OpenZFS also provides a dataset/filesystem-level encryption since a while.
I previously used GELI, but I wanted to switch to ZFS native encryption, because it provides some advantages:

* Flexibility: I can choose later which datasets to encrypt; I can encrypt different datasets with different keys.
* Zero-knowledge backups: I can send incremental backups off-site that are received and fully integrated into the target
pool *without that server ever getting the decryption keys.*
* Forward-compatibility: I can upgrade to better encryption algorithms later.
* Linux-compatibility: I can import the existing pool in a Linux environment for debugging or benchmarking.

However, I had also heard that ZFS native encryption was slower, so I decided to do some benchmarks:

<center>

| Disk                  | IOPS rand-read | IOPS read  | IOPS write | MB/s read | MB/s write | "cat speed" MB/s |
|-----------------------|---------------:|-----------:|-----------:|----------:|-----------:|-----------------:|
| no encryption         |         54,700 |   809,000  |    453,000 |     4,796 |      5,868 |            2,732 |
| geli-aes-256-xts      |         40,000 |   793,000  |    446,000 |     3,332 |      3,334 |              952 |
| zfs-enc-aes-256-gcm   |         26,100 |   513,000  |    285,000 |     3,871 |      4,648 |            2,638 |
| zfs-enc-aes-128-gcm   |         29,300 |   532,000  |    353,000 |     3,971 |      4,794 |            2,631 |

</center>

Interestingly, GELI[^3] performs much better on the IOPS, but much worse on throughput, especially on our real-life test
case. Maybe some smart person knows the reason for this, but I took this benchmark as an assurance that going with
native encryption was the right choice.[^4] One reason for the good performance of the native encryption seems
to be that it makes use of the CPU's avx2 extensions.

At this point, I feel like I do need to warn people about some ZFS encryption related issues that I learned about later.
[**Please read this**](https://github.com/openzfs/openzfs-docs/issues/494). I have had no problems to date, but make
up your own mind.

[^3]: The geli device was created with: `geli init -b -s4096 -l256`
[^4]: I wanted to perform all these tests with Linux as well, but I ran out of time 🙈

### RaidZ1


<center>

| Disk                       | IOPS rand-read | IOPS read  | IOPS write | MB/s read | MB/s write | "cat speed" MB/s |
|----------------------------|---------------:|-----------:|-----------:|----------:|-----------:|-----------------:|
| raidz1                     |       7,235    |   730,000  |    404,000 |     3,686 |      3,548 |           2,142  |
| raidz1+comp=on             |       7,112    |   800,000  |    470,000 |     3,624 |      3,447 |           2,064  |
| raidz1+aes128              |       3,259    |   497,000  |    258,000 |     3,029 |      3,422 |           2,227  |
| raidz1+aes128+comp=on      |       3,697    |   506,000  |    249,000 |     3,137 |      3,361 |           2,237  |


</center>

These are the number after creation of the RAIDZ1 based pool. I am not exactly sure what's going on in the first
column, but since a lot of time passed between this benchmark and the last, I cannot debug the original situation.
In any case, the main observations can be reproduced: encryption affects IOPS notably, but the overall read and
write throughputs are over 3,000 MiB/s in the synthetic case and over 2,000 MiB/s in the manual case.

### Other disk performance metrics

<center>

| Operation                                            | Speed [MiB/s] |
|------------------------------------------------------|--------------:|
| Copying 382 GiB between two datasets (both enc+comp) |       1,564   |
| Copying 505 GiB between two datasets (both enc+comp) |         800   |
| `zfs scrub` of the full pool                         |      11,000   |

</center>

These numbers further illustrate some real world use-cases. It's interesting to see the difference between the
first two, but it's also important to keep in mind that this is reading and writing at the same time.
Maybe some internal caches are exhausted after a while? I didn't debug these numbers further, but I think the speed is
quite good after such a long read/write.

More interesting is the speed for scrubbing, and, yes, I have checked this a couple of times. A scrub of 6.84TiB
happens in 10m - 11m, which is pretty amazing, I think, considering that it is reading the data *and* calculating
checksums. I am assuming that sequential read is just very fast and that access to the different disks happens in
parallel. The checksum implementation is apparently also avx2 optimised.

## LAN

### Network adapter

Based on recommendations, I decided to buy an Intel card. Cheaper 10GBit network cards are available from
Marvell/Aquantia, but the driver support in FreeBSD is poor, and the performance is supposedly also not close
to that of Intel.

Many people suggested I go for SFP+ (fibre) instead of
10GBase-T (copper), but I already have CAT7 cables in my flat. While I could have used fibre purely for connecting
the server to the switch (and this would likely save some power), I would have had to buy a new switch and
the options were just not economical—I already have
a switch with two 10GBase-T ports which I had bought for exactly this setup.

The cheapest Intel 10GBase-T card out there is the X540 which is quite old and available on Amazon for around 80€.
I bought two of those (one for the server and one for the workstation). More modern cards are supposedly more energy
efficient, but also a lot more expensive.[^5]

[^5]: I did try a slightly more more modern adapter with Intel 82599EN chip. This is a SFP+ chip, but I found an
adaptor with built-in 10GBase-T for around 150€. It ended up having some driver issues (you needed to plug and unplug
the CAT cable for the device to go UP), and it used more energy than the X540, so I sent it back.



### Performance

<center>

| Reading on the client via                            | Speed [MiB/s] |
|------------------------------------------------------|--------------:|
| iperf3                                               |       1,233   |
| `nc > /dev/null`                                     |       1,160   |
| NFS (`cat > /dev/null`)                              |               |

</center>

TODO fio over nfs

## Power consumption and thermals

For a computer running 24/7 in my flat, power consumption is of course important. I bought a device to measure
power consumption at the outlet to get an accurate picture.

### idle

Because the computer is idle most of the time, optimising idle power usage is most important.

<center>

|  Change                        |   W/h    |
|--------------------------------|---------:|
| default                        |     50   |
| `*_cx_lowest="Cmax"`           |     45   |
| disable WiFi and BT            |     42   |
| `media 10gbase-t`              |     45   |
| `machdep.hwpstate_pkg_ctrl=0`  |     41   |
| turn on chassis fans           |     42   |
| ASPM modes to L0s+L1 / enabled |     34   |

</center>

I assume that the same setup on Linux would be slightly more efficient, but 34W in idle is acceptable.

Clearly, the most impactful changes were:

1. Activating [ASPM](https://en.wikipedia.org/wiki/Active_State_Power_Management) for the PCIe devices in the BIOS.
2. Adding `performance_cx_lowest="Cmax"` and `economy_cx_lowest="Cmax"` to `/etc/rc.conf`.
3. Adding `machdep.hwpstate_pkg_ctrl=0` to `/boot/loader.conf`.

You can find online resources on what these options do. You might need to update the BIOS to be able to disable
WiFi and Bluetooth devices completely. You can also use hints in the `/boot/device.hints`, but this doesn't save
as much power.

Using 10GBase-T speed on the network device (instead of 1000Base-T) unfortunately increases power usage notably, but
there is nothing I could find to mitigate this.

Things that are often recommended but that did not help me (at least not in idle):
* NVME power states (more on this below)
* lower values for `sysctl dev.hwpstate_intel.*.epp` (more on this below)
* `hw.pci.do_power_nodriver=3`

<center>

| idle temperatures              |    °C    |
|--------------------------------|---------:|
| CPU                            |  37-40   |
| NVMEs                          |  52-55   |

</center>

The latter was particularly interesting, because I had heard that newer NVMEs, and especially those by Lexar get
very warm. It should be noted though, that the mainboard comes with a large heatsink that covers all NVMEs.

### under load

The only "load test" that I performed was a scrub of the pool.
Since this puts stress on the NVMEs and also the CPUs, it should be at least indicative of how things are going.

<center>

| during `zpool scrub`           |    °C    |
|--------------------------------|---------:|
| CPU                            |  55-59   |
| NVMEs                          |  69-75   |

</center>

The power usage fluctuates **between 85W and 98W.** I think all of these values are acceptable.


#### NVME tuning

<center>

| NVME power state hint | scrub speed GiB/s | W/h   |
| ----------------------|------------------:|------:|
| 0 (default)           |                11 | < 100 |
| 1                     |                 8 |  < 93 |
| 2                     |                 4 |  < 70 |

</center>

You can use `nvmecontrol` to tell the NVME disks to save energy. More information on this [here](https://nvmexpress.org/resource/technology-power-features/)
and [here](https://www.truenas.com/community/threads/nvme-autonomous-power-state-transition-apst-not-working-in-core-works-in-scale.113947/).
I was surprised that all of this works reliably on FreeBSD, but it does! The man-page is not great though. Simply
call `nvmecontrol power -p X nvmeYns1` to set the hint to Y on device X. Note that this needs to be repeated after
every reboot.

#### CPU tuning

<center>

| `dev.hwpstate_intel.*.epp` | scrub speed GiB/s  | W/h   |
| ---------------------------|-------------------:|------:|
| 50 (default)               |               11.0 | < 100 |
| 100                        |                3.3 |  < 60 |

</center>

You can use the `dev.hwpstate_intel.*.epp` sysctls for you cores to tune the eagerness of that core to scale up with
higher number meaning less eagerness.

#### Summary

I decided not to apply any of these optimisations.
Optimising power usage under load is just very difficult, because, as shown, all optimisations that reduce watts per time also increase time.
I am not certain of any good ways to quantify this, but it feels like keeping the system at 70W for 30min instead of 100W for 10min, is not really worth it.
And I kind of also want the system to be fast, that's why I spent so much money on it!

The CPU also has a cTDP mode that can be activated via the BIOS and which is "worth it", according to some articles
I have read. I might give this a try in the future.


## Price

## Final remarks


## Footnotes


