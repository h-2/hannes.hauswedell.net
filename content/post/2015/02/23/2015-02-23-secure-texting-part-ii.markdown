---
author: h2
comments: true
date: 2015-02-23 21:33:47+00:00

link: /post/2015/02/23/secure-texting-part-ii/
slug: secure-texting-part-ii
title: Secure Texting Part II
wordpress_id: 364
categories:
- (Free) Software
- Privacy
---

Last summer I [blogged](/post/2014/06/25/secure-texting-and-why-fsfe-cares/) about secure messaging and why FSFE cares about it (and why you should, too!). Since then a few things have changed, and I want to give you an update on the situation.<!-- more -->

The conclusion of my last article was:



<blockquote>TextSecure and Kontalk are both good apps in our eyes, however, TextSecure has a much larger adoption and its protocol has gone through more reviews. The protool is integrated into CyanogenMod, recommended by leading security experts and the project just recently gained lots of media attention and $400.000 funding. So we believe if we are to have a chance at migrating people away from WhatsApp than TextSecure is the way to go.</blockquote>



We knew that TextSecure depended on Google Play Services last year, but we were hoping that this was a temporary problem, as virtually every other messaging app in existence has a fallback mode for delivery that does not require proprietary (Google) components. Unfortunately we were wrong: nearly a year later the development of a websocket based version of TextSecure [has](https://github.com/WhisperSystems/TextSecure/issues/1000#issuecomment-68592064) [stalled](https://github.com/WhisperSystems/TextSecure/issues/1000#issuecomment-74924059). Lead developers at WhisperSystems have stated repeatedly that it is not important to them, and the many requests, tests and code contributions from external people did not result in the situation now being any better than it was a year ago.

Furthermore WhisperSystems has [repeatedly](https://f-droid.org/forums/topic/flock-secure-contact-and-calendar-syncing-application-for-android/) [demanded](https://github.com/WhisperSystems/TextSecure/issues/1000#issuecomment-61114605) other people not distribute modified and unmodified versions of their software. While I believe that WhisperSystems is sincere about security, they seem to have no problem with the security implications of proprietary software, sharing meta-data with Google (by means of Google Push) and [now working for WhatsApp](https://whispersystems.org/blog/whatsapp/) / Facebook. This is all a sad example for a project that does license its code under Free licenses, but that otherwise is between uninterested and hostile towards community involvement and the Free Software landscape.

**Fortunately, not all is lost!** The other program mentioned already a year ago, [Kontalk](http://kontalk.org/), is doing great. Kontalk is community-based and is transparently financed [through donations](http://kontalk.net). It is based on XMPP, actively develops new extensions and proposals for XMPP and their developers are very friendly towards suggestions and community involvement. The server side is even implemented as extensions on top of an existing XMPP server and you can of course run your own (the server isn't even hardcoded in the app, can be changed via the options). It runs without any proprietary components and is [available in F-Droid](https://f-droid.org/repository/browse/?fdfilter=kontalk&fdid=org.kontalk). There is also a desktop client, although I haven't tried it, yet.

Some of Kontalk's features are:  

 • contact discovery via phone numbers  

 • transport and end-to-end encryption  

 • working picture and file sharing  

 • customizable privacy settings (per-user in future versions)  

  

It is currently still in beta, but some of the expected features for the 3.0 are:
 • group chats  

 • perfect forward secrecy  

 • sharing of message history between multiple clients  

 • federation with regular jabber servers(!!!)  

  

I use it day to day and have experienced only few issues. You should it give it a try! And maybe you can help with spreading the word, [reporting bugs](https://github.com/kontalk/androidclient/issues) or even contributing code?

edit: see I am not big for Valentine's day, but maybe this counts a slightly delayed #ilovefs for Kontalk ;)

