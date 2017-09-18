---
author: h2
comments: true
date: 2014-06-25 14:08:55+00:00

link: /post/2014/06/25/secure-texting-and-why-fsfe-cares/
slug: secure-texting-and-why-fsfe-cares
title: Secure Texting and why FSFE cares
wordpress_id: 282
categories:
- Privacy
---

Heard of WhatsApp? If you haven't used it before (I e.g. haven't), you can think of it as a free-of-charge messaging app that knows which of your contacts also have the app and automatically routes messages to them over your dataplan instead of SMS, so it's (usually) free of charge.
In the face of NSA and WhatsApp's recent acquisition by Facebook, many of the million WhatsApp users are looking for secure and trustworthy alternatives.
<!-- more -->

Because this effects so many people, we at the Free Software Foundation Europe would like to promote an alternative that respects your freedom and privacy. Therefore we decided to do some research and to hold a workshop on WhatsApp alternatives during our German-speaking FSFE team meeting ten days ago.

While most tech-people including myself really didn't see the point in WhatsApp -- after all there is XMPP -- I now understand better why it's so popular. Easy integration with the operating system and automatic contact discovery seem to be crucial features for the masses. And I do have to admit that both, encryption (OTR) and file transfers, are not yet solved reliably and/or conveniently with popular XMPP clients.

So we ruled out promoting Xabber or ChatSecure as a good alternatives to WhatsApp and turned our focus to other currently popular apps:  

· [Kontalk](http://kontalk.org/)  

· [Telegram](https://telegram.org/)  

· [TextSecure](https://whispersystems.org/)  

· [Threema](https://threema.ch)  

· [Surespot](https://www.surespot.me/)  


Of these, Threema seems to be quite popular and is recommended by many people although it is completely proprietary. And Telegram is proprietary on the server side, so we immediately ruled those two out. After all, the interception of communication (man-in-the-middle) is not the only surveillance scenario; the client software needs to be trustworthy as well. And depending on a single Server definitely is also not the path to freedom.

Surespot is Free Software, but doesn't have automatic contact discovery through phone numbers, so we think it will probably not be competitive in the market segment that is currently dominated by WhatsApp.

TextSecure and Kontalk are both good apps in our eyes, however, TextSecure has a much larger adoption and its protocol has gone through more reviews. The protool is integrated into CyanogenMod, recommended by leading security experts and the project just recently gained lots of media attention and [$400.000 funding](http://www.knightfoundation.org/grants/201499909/). So we believe if we are to have a chance at migrating people away from WhatsApp than TextSecure is the way to go. 

Unfortunately, TextSecure relies on Google Cloud Messaging for pushing messages to the user. This comes in form of a dependency on a proprietary Google library, part of the "Google Play Services". This is unacceptable for many reasons, [this page](http://arstechnica.com/gadgets/2013/10/googles-iron-grip-on-android-controlling-open-source-by-any-means-necessary/4/) sums up some of them.

As a consequence we have starting testing and supporting a version of TextSecure that provides an alternative mechanism for message distribution. We are confident that the issue will be solved sooner or later (as the announced desktop and iOS clients will have to work with something else anyway), but if you have free time, please [help the effort](https://github.com/WhisperSystems/TextSecure/issues/1000).

Once this is achieved, TextSecure will be a great alternative to WhatsApp, easy to use, free as in freedom and respecting your privacy.
