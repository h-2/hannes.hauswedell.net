---
author: h2
comments: true
date: 2012-06-14 13:22:09+00:00

link: /post/2012/06/14/a-versatile-open-and-future-proof-audio-setup-part-2-storage/
slug: a-versatile-open-and-future-proof-audio-setup-part-2-storage
title: A versatile, open and future-proof audio setup [ part 2 ] Storage
wordpress_id: 122
categories:
- (Free) Software
---

This post covers storage and organisation of the files.<!-- more -->



## General Layout



    
    MUSICDIR
      │
      ├── FILES
      │    ├── _flac
      │    ├── _flac_vorb
      │    ├── _other
      │    └── _vorb
      │
      ├── LINKS
      │    ├── best
      │    ├── smallest
      │    └── vorb
      │
      └── meta


Ok, the obvious stuff:
· `MUSICDIR` is where you keep your music.
· `FILES` is a sub directory that contains your actual files.
· `LINKS` contains links to files from `FILES`, based on certain criteria.
· `meta` contains maintenance scripts and other stuff that is not music.



## Files


`FILES` contains four subdirectories. `_flac` contains my music in the [FLAC-format](http://flac.sourceforge.net). FLAC is a lossless audio codec, for more information click on the link. To be honest, I am not sure if I can hear the difference between FLAC and [Ogg Vorbis](http://www.vorbis.com) at high bitrates, but that's not the point. I don't want to worry about quality and I want to be able to convert formats, if a better one appears, which is only feasible for lossless audio (you should never convert between lossy formats as it just increases lossiness).

Now while I am slowly reripping my music collection to FLAC, there is also some music where I only have the lossy versions on my hard-disk (e.g. broken or lost CDs…). These files go to `_vorb` if they are in Ogg Vorbis, or to `_other` if they are MP3, MPC or some other weird format. The `_flac_vorb` folder is special, it contains all the music I have as FLAC, but converted to low quality Ogg Vorbis (Quality 2.5). This is, because in some situations FLAC is not handy, e.g. when your bandwidth is limited or your storage is limited... the details will be explained later. A Script that converts your FLAC to Vorbis while preserving the file system hierarchy and Tags is available [here](/post/2012/06/update_flac_vorb.sh_.txt).

Note that it is important that beneath the codec-directories you have the same hierarchy, i.e. if you organize your music by genre, you should do so for all codecs. Any other way of sorting is also good, but don't have all your files just flying around on the topmost level. Actually the scripts do not allow any files on the topmost level, just directories. In case you were wondering, this is how I currently file my music beneath the aforementioned levels, although it is completely unimportant for the setup:


    
    .../genre/artist/year - albumtitle/artist - tracknumber - tracktitle.ext





## Links


The folders in `LINKS` are based on certain criteria. Since there is some redundancy in my files (songs both available as FLAC and Vorbis), I want to remove that. Also when actually playing music, of course I don't want to worry about which format it is in, I want two CDs by the same artist to appear in the same folder, even if they are in different formats. So I wrote a little [script](/post/2012/06/update_LINKS.sh_.txt) that "joins" the folders from `FILES` by creating lots of symlinks in `LINKS`. It currently creates three "joins":
· `best` : contains the highest quality version of a song. This folder is the folder you want to index with computers on the local network (or just your desktop)
· `smallest` : contains the smallest file of each song. This folder is the folder you want to index from computers that access the music from remote locations. It is also the directory you will want to sync to your portable audio player, your phone, whatever...
· `vorbis` : contains just the vorbis files (original and flac-converted ones). I am not using this yet, but I want to serve this with OwnCloud, so I can listen to the music with html5 from other places. It might also be useful, if you want to stream through icecast or so.

Note that these are really many links if your music collection is big. I don't know if that's an issue on certain filesystems (I use ZFS, so I know it doesn't matter).



## Serving the files


Ok, now you have the music organized. You can think about how to serve it. I have it on a server, and can access it from different locations. I think that's a good idea, but you can do all the stuff explained here on your regular computer as well.



## Known Issues


· The scripts currently don't do any cleanup, which is not optimal. I will fix that, as soon as I get time. When it's fixed, it should be feasible to have the scripts run by cron.
· When you change something in the hierarchy (e.g. split a genre folder up into two, want to delete an artist,…) you have to do this in all the folders in `FILES` which may be annoying (`LINKS` will be updated automatically, though).

_stay tuned for the next post about portable audio!_
