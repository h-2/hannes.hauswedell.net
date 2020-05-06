---

author: h2
date: 2020-04-20 19:10:00+02:00

title: 👾 Game-streaming without the "cloud" 🌩️

slug: 20/gamestream

fsfe_commentid: 7
gh_commentid: 7
tweetid: 1252288545542279176
tootid: 104032101920137256

<!-- draft: true -->

toc: true

categories:
- random-nerdiness
- privacy

tags:
- games
- gamestream
- stadia
- steam
- drm
- cloud-gaming
- geforcenow

---

With increasing bandwidths, live-streaming of video games is becoming more and more popular -- and might further accelerate the demise of the desktop computer.
Most options are "cloud-gaming" services based on subscriptions where you don't own the games and are likely to be tracked and monetised for your data.
In this blog post I present the solution I built at home to replace my "living room computer".

<!--more-->

## TL; DR

<p align="center">

[![](/post/2020/04/summary-small.png)](/post/2020/04/summary.jpg)

</p>

I describe how to stream a native Windows game ([Divinity Original Sin 2](https://divinity.game/) -- installed DRM-free from [GOG](https://www.gog.com/game/divinity_original_sin_2)) via [Steam Remote Play](https://store.steampowered.com/app/353380/Steam_Link/) from my Desktop (running [Devuan GNU/Linux](https://devuan.org/)) in 4K resolution and maximum quality directly to my TV (running Android).
On the TV I then play the game with my flatmate using two controllers: one Xbox Controller connected via USB, one Steam-Controller connected via Bluetooth.
The process of getting there is not trivial or flawless, but gaming itself works perfectly without artefacts or lag.

(The computer in the above photo is not used any longer.)

## Motivation

The big "cloud" streaming services for audio and video are incredibly convenient.
In my opinion they address the following problems very well:

1. They make content available on hardware that wouldn't have the capability to store the content.
2. This includes *all* devices of the user, not just a single (desktop/laptop) computer.
3. They provide access to a lot of content at a fixed monthly price (especially useful for people who haven't had the possibility to build up their "library").

On the other hand, they usually force you to use software that is non-free and/or not trustworthy (if they support your OS at all).
You risk losing access to all content when the subscription is terminated.
And -- often overlooked -- they monitor you very closely: what you watch/listen to, when and where you do it, when you press pause and for how long etc.
I suspect that at some point this data will be more valuable than the income generated from subscription fees, but this is not important here.

It was only a matter of time before video-gaming would also become part of the streaming business and there are now multiple contenders: [Google Stadia](https://stadia.google.com/) and [Playstation Now](http://playstationnetwork.com/) are typical "streaming services" like Netflix for video; the games are included in the monthly fee.
They have all the benefits and problems discussed above.
Other services like [GeForce Now](https://www.nvidia.com/en-us/geforce-now/) and [Blade Shadow](https://shadow.tech/) provide computation and streaming infrastructure but leave it to you to provide the games (manually or via gaming platforms).
This has slightly different implications, but I dont' want to discuss these further, because I haven't used any of them and likely won't in the future.

In any case, I am of course not a big fan of being tracked and anything I can set up with my own infrastructure at home, I try to do!
\[I actually don't really spend that much time gaming nowadays, but setting this up was still fun\].
In the past I have had an extra (older) computer beside the TV that I used for casual gaming.
This has become to old (and noisy) to play current games, so instead I want stream the game from my own desktop computer in a different room.

Disclaimer: It should be noted that this "only" provides feature 2. above, i.e. convergence of different devices.
Also this setup includes using various non-free software components, i.e. it also does not solve all of the problems mentioned above.

## Setting up the host

The "host" is the computer that renders the game, in my case the desktop computer.
Before attempting to stream anything, we need to make sure that everything works on the host, i.e. we need to be able to play the game, use the controllers etc.

### Hardware

| CPU                       | RAM     | GPU                |
|---------------------------|---------|--------------------|
| AMD Ryzen 6c/12t @ 3.6Ghz | 32GB    | GeForce RTX 2060S  |


Since the host needs to render the game, it needs decent hardware.
Note that it needs to be able to encode the video-stream at the same time as rendering the game which means the requirements are even higher than usual.
But of course all of this also depends on the exact games that you are playing and which resolution you want to stream.
My specs are shown above.

### The game

<p align="center">

[![](/post/2020/04/dos2-small.png)](/post/2020/04/dos2.jpg)

</p>

I chose [Divinity Original Sin 2](https://divinity.game/) for this article because that's what I am playing right now and because I wanted to demonstrate that this even works with games that are not native to Linux (although I usually don't buy games that don't have native versions).
If you buy it, I recommend getting it on [GOG](https://www.gog.com/game/divinity_original_sin_2), because games are DRM-free there (they work without internet connection and stay working even if GOG goes bankrupt).
The important thing here is that the game does not need to be a Steam game even though we will use Steam Remote Play for streaming.
Buying it on Steam will make the process a little easier though.

Install the game using [wine](https://www.winehq.org/) (`wine` in Devuan/Debian repos).
I assume that you have installed it to `/games/DOS2` and that you have setup a "windows disk G:\" for `/games`.
If not, adjust paths accordingly.

### Steam

If you haven't done so already, install Steam.
It is available in Debian/Devuan non-free repositories as `steam` but will install and self-update itself in a hidden subfolder of your home-directory upon first start.
You need a steam-account (free) and you need to be logged in for everything to work.
I really dislike this and it means that Steam quite likely does gather data about you.
I suspect that using non-Steam games makes it more difficult to track you, but I have not done any research on this.
See the end of this post for possible [alternatives](#alternatives).

The first important thing to know about Steam on Linux is that it ships many system libraries, but it doesn't ship everything that it needs and it gives you no diagnostic about missing stuff nor are UI elements correctly disabled when the respective feature is not available.
This includes support for hardware video encoding and for playing windows games.

<p align="center">

[![](/post/2020/04/advanced_host_settings-small.png)](/post/2020/04/advanced_host_settings.png)

</p>

Hardware-video encoding is a feature you really want because it reduces latency and load on your CPU.
For reasons I don't understand, Steam uses neither `libva` (the standard interface for video acceleration on free operating systems) nor `vdpau` (NVIDIA-specific but also free/open).
Instead it uses the proprietary NVENC interface.
On Debian / Devuan his has been patched out of all the libraries and applications, so you need to make sure that you get your libraries and apps like `ffmpeg` from the [Debian multimedia project](http://www.debt-multimedia.org/) which has working versions.
I am not entirely sure which set of libraries/apps is required, for me it was sufficient to install `libnvidia-encode1` and do an `apt upgrade` after adding the debian multimedia repo.
Note that only installing `libnvidia-encode1` from the official repo was not sufficient.
See the [troubleshooting section](#troubleshooting) on how to diagnose problems with hardware video encoding.

<p align="center">

[![](/post/2020/04/proton_everywhere-small.png)](/post/2020/04/proton_everywhere.png)

</p>

To play Windows games with Steam, you can use Steam's builtin windows emulator called Proton ([here's a current articel on it](https://boilingsteam.com/proton-brought-about-6000-games-to-linux-so-far/)).
It's a fork of [Wine](https://www.winehq.org/) with additional patches (most of which are upstreamed to official wine later).
Unfortunately it is not installed after a fresh install of Steam on Linux and I found no explicit way of installing it (the interface still suggests it's there, though!).
To get it, select "Enable Steam Play for all titles" in the "Advanced" "Steam Play Settings" in the settings.
This activates usage of Proton for Windows games not officially supported. Then install the free Windows game [1982](https://store.steampowered.com/app/639650/1982/) from inside Steam.
This will automatically install Proton which is then listed as an installed application and updated automatically in the future.
You can try the game to make sure Proton works as expected.
Alternatively, buy the actual game on Steam and skip the next paragraph.

<p align="center">

[![](/post/2020/04/edit_properties-small.png)](/post/2020/04/edit_properties.png)

</p>

Now go to "Games" → "Add a Non-Steam Game to my Library...", then go to "BROWSE", show all extensions and find the executable file of the game.
In our case this is `/games/DOS2/DefEd/bin/EoCApp.exe` or `G:\DOS2\DefEd\bin\EoCApp.exe` (yes, it's not in the top-level directory of the game).
If your path contains spaces, it will break (without diagnostics).
To fix this, simply edit the shortcut created for the game again and make sure the path is right and "set launch options" is empty (part of your path may have ended up there).
In this dialog you can also explicitly state that you wish to use Proton to run the game (confusingly it will show multiple versions even if none of those are installed).
You can also give the game a nicer name or icon if desired.


### Test the game

You are now ready to test the game.
Simply click on the respective button.
Now is also a good time for testing the controller(s), because if they don't work now, they likely won't later on.
There are many tutorials on using the (Steam) controller on Linux and there are also some notes in the [troubleshooting section](#troubleshooting).

This is also a good point in time to update the firmware of the steam controller to the newest version; we will need that later on.

## Setting up the client

The client is my TV, because that runs Android TV and there is a SteamLink application for Android.
If your TV has a different OS, you could probably use a small set-top-box built around a cheap embedded board and use Android (or Linux) as the client OS from that.
I suppose all of this would be possible on an Android Tablet, as well.
I recommend connecting the TV via wired network to the host, but WiFi works at lower resolutions, too.

### Controllers and Android

The Xbox controller is just plugged into the USB-port of the TV and required no further configuration.
The Steam controller was a little more tricky, and I had no luck getting it to work via USB.
However, it comes with Bluetooth support (only after upgrading the firmware!).

Establishing the initial Bluetooth connection between the TV and the controller was surprisingly difficult.
Start the Steam-controller with Steam+Y pressed or alternatively with Steam+B pressed and only do so after initiating device search on the TV.
If it does not work immediately, keep trying!
After a few attempts, the TV should state that it found the device; it calls it SteamController but recognises it as a Keyboard+Mouse.
That's ok.

After the connection has been established once, the controller will auto-connect when turned off and on again (do not press Y or B during start!).
The controller's mouse feature is surprisingly useful in the Android TV when you use Android apps that are not optimised for the TV.

### SteamLink / Steam Remote Play

You need to install the [SteamLink application from GooglePlay](https://play.google.com/store/apps/details?id=com.valvesoftware.steamlink) or through another channel like the [Aurora Store](https://auroraoss.com/) (my Android TV is not associated with a Google account so I cannot use GooglePlay).
After opening the app, Android will ask whether it should allow the app to access the Xbox controller which you have to agree to everytime (the "do this in the future" checkbox has no effect).
Confusingly the TV then notifies you that the controller has been disconnected.
This just means that the app controls it, I think.
The app takes control of the Steam controller without asking and switches it from Keyboard+Mouse mode into Controller mode, so you can use the Joystick to navigate the buttons in the app.

<p align="center">

[![](/post/2020/04/steamlink-small.png)](/post/2020/04/steamlink.jpg)

</p>


It should automatically detect Steam running on the host and offer to make a connection.
Press A on the controller or select "Start Playing".
The connection has to be verified once on the host for obvious reasons, but if everything works well you should now see the "Steam Big Picture Mode" interface on you TV.
Your Desktop has switched to this at the same time (in general, the TV will now mirror your desktop).
Maybe first try a native Steam game like the aforementioned "1982" to see if everything works.

Next try to start the Game we setup above via its regular entry in your Steam Library.
Note that upon starting, the screen will initially flash black and return to Steam; the game is starting in the background, do not start it again, it just needs a second!

Everything should work now!
If you hear audio but your screen stays black and shows a "red antenna symbol", see the [troubleshooting section](#troubleshooting) below.

You can press the Steam-Button to return to Steam (although this sometimes breaks for non-native Steam games).
You can also long-press the "back/select"-button on the controller to get a SteamLink specific menu provided by the Client.
It can be used to launch an on-screen keyboard and force-quit the connection to the host and return to the SteamLink interface.

### Video resolutions and codecs

<p align="center">

[![](/post/2020/04/advanced_settings-small.png)](/post/2020/04/advanced_settings.jpg)

</p>

If everything worked so far you are likely playing in 1080p.
To change this to 4k resolution, go to the SteamLink app's settings (wheel symbol) and then to "streaming settings" and then to "advanced".
You can increase the resolution limit there and also enable "HEVC Video" which improves video quality / reduces bitrate.
If your desktop does not support streaming HEVC, SteamLink will establish no connection at all.
See the [troubleshooting section](#troubleshooting) below if you get a black screen and the "red antenna symbol".

## Alternatives

The only viable alternative to Steam's Remote Play for streaming your own games from your own hardware is [NVIDIA GameStream](https://www.nvidia.com/en-us/shield/support/shield-tv/gamestream/) -- not to be confused with NVIDIA GeForce Now, the "cloud gaming" service.
The advantages of GameStream over Steam Remote Play seem to be the following:

  1. The protocol is documented and there are good [Free and Open Source client implementations](https://moonlight-stream.org/).
  2. It claims better performance by tying closer into the host's drivers.
  3. No online-connection or sign-up required like with Steam.

Also NVIDIA is a hardware company and even if the software is proprietary, it might be less likely to spy on you.
The disadvantages are:

  1. The host software is only available for Windows.
  2. Only works with NVIDIA GPUs on the host machine, not AMD.

I could not try this, because I don't have a Windows host and I wanted to stream from GNU/Linux.

## Post scriptum

As you have seen the process really still has some rough edges, but I am honestly quite surprised that I did manage to set this up and that it works with really good quality in the end.
Although I don't like Steam because of its DRM, I have to admit that its impressive how much work they put into improving the driver situation on GNU/Linux and supporting such setups as discussed here.
Consider that I didn't even buy a game from Steam!

I would still love to see a host implementation of NVIDIA GameStream that runs on GNU/Linux.
Even better would of course be a fully Free and Open Source solution.

On a sidenote: the setup I showed here can be used to stream any kind of application, even just the regular desktop if you want to (check out the advanced client options!).

Hopefully Steam Remote Play (and NVIDIA GameStream) can delay the full transition to "cloud gaming" a little.

## Troubleshooting

<details style='border:1px solid; padding: 2px; margin: 2px'>
<summary>No hardware video encoding</summary>
To see if Steam is actually using your hardware encoding, look in the following log-file:

```
~/.steam/debian-installation/logs/streaming_log.txt
```

You should have something like:

```
"CaptureDescriptionID"  "Desktop OpenGL NV12 + NVENC HEVC"
```

The `NVENC` part is important. If you instead have the following:

```
"CaptureDescriptionID"  "Desktop OpenGL NV12 + libx264 main (4 threads)"
```

It means you have software encoding.
Play around with `ffmpeg` to verify that NVENC works on your system. The following two commands should work:
```
% ffmpeg -h encoder=h264_nvenc
% ffmpeg -h encoder=hevc_nvenc
```

The second one is for the HEVC codec. If you are told that the selected encoder is not available, something is broken.
Check to see if you correctly upgraded to the libraries from the [Debian multimedia project](http://www.debt-multimedia.org/).
</details>

<details style='border:1px solid; padding: 2px; margin: 2px'>
<summary>Controller not working at all on host</summary>
Likely your user account does not have permissions to access the device.
It worked for me after making sure that my user was in the following groups:

```
audio dip video plugdev games scanner netdev input
```

</details>

<details style='border:1px solid; padding: 2px; margin: 2px'>
<summary>Controller working in Steam but not in game</summary>

When you start Steam but leave BigPicture mode (Alt+Tab or minimise), Steam usually switches the controller config back to "Desktop mode" which means Keyboard+Mouse emulation.
If a game is started then, it will not detect any controller.
The same thing seams to happen for certain non-steam games started through Steam.
A workaround is going into the Steam controller settings and selecting the "Gamepad" configuration also as default for "Desktop mode".

</details>

<details style='border:1px solid; padding: 2px; margin: 2px'>
<summary>Black screen and "red antenna symbol"</summary>

This happens when there is a resolution mismatch somewhere.
Note that we have multiple places and layers where resolution can be set and that steam doesn't always manage to sync these: the host (operating system, Steam, In-Game), the client (operating system, SteamLink).
Additionally, Steam apparently can stream in a lower resolution than is set on either host or target.

I initially had this problem when streaming from 4k-host onto a SteamLink app that was configured to only accept 1080p.
Changing the host resolution manually to 1080p before starting Steam solved this problem.

Now that everything (Host, In-Game, SteamLink on client) are configured to 4k, I still get this problem, because apparently Steam still attempts to reduce transmission resolution when starting the game.
For obscure reasons the following workaround is possible: After starting the game, long-press "back/select" on the Controller to get to the SteamLink menu and select "Stop Game" there.
This fixes the Black Screen and the regular game screen appears at 4K resolution.
I suspect that "Stop game" terminates Steam's wrapper around the game's process that screws up the resolution.
The devil knows why this does not terminate the game.

</details>

<details style='border:1px solid; padding: 2px; margin: 2px'>
<summary>SteamLink produces black screen and nothing else</summary>

When switching in out of SteamLink via Android (e.g. TV remote), SteamLink sometimes doesn't recover.
Probably something goes wrong with putting the app to standby, but it's also not something you typically would. Just quit the app correctly.

In any case, only a full reboot of the TV seems to fix this and make SteamLink usable again.

</details>
