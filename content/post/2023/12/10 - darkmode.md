---

author: h2
date: 2023-12-10 16:30:00+00:00

title: 🌓 Commandline dark-mode switching for Qt, GTK and websites 🌓

slug: 10/darkmode

fsfe_commentid: 9
gh_commentid: 9
tweetid:
tootid: 111557161908299823

<!-- draft: true -->

toc: true

categories:
- random-nerdiness

tags:
- firefox
- gnome
- kde
- sway
- darkmode
- dark-mode
- dark-reader
- wayland


---

This post documents how to toggle your entire desktop between light and dark themes, including your apps
and the websites in your browser.

<!--more-->

## Motivation

Like many other people, I use my computer(s) with varying degrees of ambient light. When there is lots of light,
I want a bright theme, but in the evenings, I prefer a dark theme. Switching this for Firefox and several toolkits
manually almost drove me crazy, so I will document here how I automated the entire process.

I use the Sway window manager which makes things a bit more difficult, because neither the UI unification mechanisms
of GNOME nor KDE automatically kick in.
I use Firefox as a browser, and I also want the websites to switch themes.
And of course, I want the theme switch to be applied immediately and not just on restartet apps.


## Demo

<video autoplay="true" loop>
  <source src="/post/2023/12/video_small.webm" type="video/webm">
  Your browser does not support the video tag.
</video>

This is what it looks like when it's done. Dolphin (KDE5), Firefox, the website inside Firefox, and GEdit (GTK) all switch together.

## Primary script

```sh
#!/bin/sh

current=$(gsettings get org.gnome.desktop.interface color-scheme)

if [ "${current}" != "'prefer-dark'" ]; then #default

    echo "Switching to dark."
    gsettings set org.gnome.desktop.interface color-scheme prefer-dark
    gsettings set org.gnome.desktop.interface gtk-theme Adwaita-dark
    gsettings set org.gnome.desktop.interface icon-theme breeze-dark

else # already dark

    echo "Switching to light."
    gsettings set org.gnome.desktop.interface color-scheme default
    gsettings set org.gnome.desktop.interface gtk-theme Adwaita
    gsettings set org.gnome.desktop.interface icon-theme breeze

fi
```

This is the primary script. It works by manipulating the gsettings, so we will have to make everything else follow these settings.
The script operates in a toggle-mode, i.e. running it repeatedly switches between light and dark.
I had hoped that the color-scheme preference would be the only thing needing change, but the gtk-theme needs to
also be switched explicitly.
I am not aware of any theme other than Adwaita that works on all toolkits.

Switching the icon-theme is not necessary, but recommended. To get a list of installed icon themes,
`ls /usr/share/icons`.

## Packages

This is the list of packages I installed on Ubuntu 23.10. Note that if you miss certain packages, things will not work
without telling you why. I started this install with a Kubuntu ISO, so depending on your setup, you might need
to install more packages, e.g. `libglib2.0-bin` provides the `gsettings` binary.

Package list:

```sh
libadwaita                  # GTK3 theme (auto-installed)
adwaita-qt                  # Qt5 theme
adwaita-qt6                 # Qt6 theme
gnome-themes-extra          # GTK2 theme
gnome-themes-extra-data     # GTK2 theme and GTK3 dark theme support
qgnomeplatform-qt5          # Needed to tell Qt5 and KDE to use gsettings
#qgnomeplatform-qt6         # If your distro has it
```

I am not exactly sure where the GTK4 theme comes from, and I have no app to test that. If you want to use the breeze
icon theme, also install `breeze-icon-theme`.

## Configuration

### GTK apps

You should already be able to switch GTK apps by running the script. Give it a try!

### Firefox app

Firefox should also switch its own theme after invoking the script. If it does not, check the following:

  * Your XDG session is treated by Firefox as being GNOME or something similiar.[^1]
  * Go to `about:addons`, then "Themes" and make sure you have selected "System-Theme (automatic)". [^2]
  * Go to `about:support` and look for "Windows Protocol". It should list `wayland`. If it does not, restart your Firefox with `MOZ_ENABLE_WAYLAND=1` set in the environment.
  * Go to `about:support` and look for "Operating System theme". It should list `Adwaita / Adwaita`. If it does not, you are likely missing some crucial packages.
  * Double-check the `gnome-themes-extra` or similar packages on your distro. I didn't have these initially and it prevented Firefox from picking up the theme.

I haven't tried any of this with Chromium, but I might at some point in the future.

[^1]: I have verified that an XDG desktop portal of `wlr` or `gtk` works, and also that a value of `kde` does not work; so this won't work within a KDE session.
[^2]: If you get spurious flashes of white between website loading or tab-switches, you can later switch this to the "Dark" theme and it should still turn bright when in global bright mode.

### Firefox (websites)

Next are the websites *inside* Firefox. Make sure your Firefox propagates its own theme settings to its websites:

<center>

![](/post/2023/12/website_theme.png#center "This can be found in your settings.")

</center>

Websites like https://google.com should now respect your system's theme. However, running our script will not affect open tabs; you need to reload the tab or open a new tabe to see the effects.

Many other sites do not have a dark theme, though, or do not apply it automatically. To change these sites, install the great [dark reader firefox plugin](https://addons.mozilla.org/de/firefox/addon/darkreader/)!

<center>

![](/post/2023/12/dark_reader.png#center)

</center>

Configure the plugin for automatic bahaviour based on the system colours (as shown above). Now is the time to test the script again! Websites controlled by Dark Reader should update immediately without a refresh. This is one reason to prefer Dark Reader's handling over native switching (like that of https://google.com ).[^3] If this is the behaviour you want, make sure that websites are not disabled-by-default in Dark Reader (configurable through the small ⚙ under the website URL in the plugin-popup); this is the case for e.g. https://mastodon.social.

[^3]: Native dark themes may or may not look better than whatever Dark Reader is doing. I often prefer Dark Reader, because it allows backgrounds that are not fully black.

An option you might want to play with is found under "more → Change Browser Theme". This makes the plugin control the Firefox application theme. This is a bit of a logic loop (script changes Firefox theme → triggers Plugin → triggers update of theme), but it often works well and usually gives a slightly different "dark theme look" for the application.


### Qt and KDE apps

There are multiple ways to make Qt5 and KDE apps look like GTK apps:

1. Select the Adwaita / Adwaita-Dark theme as the native Qt theme (`QT_QPA_PLATFORMTHEME=Adwaita` / `QT_QPA_PLATFORMTHEME=Adwaita-dark`)
2. Select "gtk2" as the native Qt theme (`QT_QPA_PLATFORMTHEME=gtk2`)
3. Select "gnome" as the native Qt theme (`QT_QPA_PLATFORMTHEME=gnome`)

All of these work to a certain degree, and I would have liked to use first option. But for neither 1. nor 2., I was able to achieve "live switching" of already open applications upon invocation of the script.
In theory, one should also be able to use KDE's `lookandfeeltool` to switch between the native Adwaita and Adwaita-dark themes (or any other pair of themes), but I was not able to make this work reliably.[^3]

[^3]: You would need to add `lookandfeeltool -a THEME` invocations to the script, but the tool seems to only work within a KDE session. Also, it does not find my Adwaita Qt themes.

Note that for Qt6 applications to switch theme with the rest, `qgnomeplatform-qt6` needs to be installed, which is not available on Ubuntu. Other platforms ([like Arch's AUR](https://aur.archlinux.org/packages/qgnomeplatform-qt6-git)) seemed to have it, though.

Note also that in Sway you need to make sure that `QT_QPA_PLATFORMTHEME` is defined in the context where your applications are started. This is typically not the case within the sway config, so I do the following:

```
bindsym $mod+space exec /home/hannes/bin/preload_profile krunner
```

Where `preload_profile` executes all arguments given to it, but imports `~/.profile` before.


## Possible extensions

### Screen brightness

Before I managed to setup theme-switching correctly, I used a script to control brightness. Now that theme switching works, I don't do this anymore, but in case you want this additionally:

* You can use `brightnessctl` to adjust the brightness of the built-in screen of your Laptop.
* You can use `ddcutil` to adjust the brightness of an external monitor (this affects actual display brightness not Gamma).


### Automation

If desired, you could automate theme switching with cron or map hotkeys to the script.

## Closing remarks

I am really happy I got this far; the only thing that does not update live is the icon theme in KDE applications. If anyone has advice on that, I would be grateful!

I have used the method of having everything behave like being on GNOME here. In theory, it should also be possible to set XDG portal to `kde` and use `lookandfeeltool` instead of `gsettings`, but I did not yet manage to make that work.If you have, please let me know!
