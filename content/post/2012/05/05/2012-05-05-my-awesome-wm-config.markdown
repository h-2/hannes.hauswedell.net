---
author: h2
comments: true
date: 2012-05-05 12:57:40+00:00

link: /post/2012/05/05/my-awesome-wm-config/
slug: my-awesome-wm-config
title: my awesome (wm) config
wordpress_id: 81
categories:
- (Free) Software
---

Since quite a few people have been asking me for my awesome config, I thought I'd upload it. 

For those of you who don't know awesome, [check it out](http://awesome.naquadah.org/), it's awesome! SCNR <!-- more -->

Main differences from the default are:
	
* remove all panels and stuff, because they are ugly


* load xfce4-panel instead, because it's light, but provides stuff like mpd-controls &c


* create 12 tags (virtual desktops)


* bind certain type of applications to certain desktops


* map Meta to ALt instead of Winkey, because my main kbd doesn't have a winkey


* map the tags to F* instead of the number keys, so I get tags with Alt+F* (original unix style)


* use cairo-compmgr where available (unfortunately not on FreeBSD) and pre-start some other stuff (e.g. launchy for running things)


  

Thats basically it. I have thought about using shifty for dynamic tagging, but haven't gotten around to trying it, yet.


Here it is: [rc.lua](/post/2012/05/rc.lua_.txt)  

(in case you consider that bit of code as (c)-able I hereby release into CC0 / public domain)
