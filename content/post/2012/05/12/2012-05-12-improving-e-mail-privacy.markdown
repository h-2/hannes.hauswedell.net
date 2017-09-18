---
author: h2
comments: true
date: 2012-05-12 19:07:37+00:00

link: /post/2012/05/12/improving-e-mail-privacy/
slug: improving-e-mail-privacy
title: Improving E-Mail Privacy
wordpress_id: 87
categories:
- Privacy
---

I have recently decided to use PGP / GnuPG to sign and encrypt emails, and I also recently switched from KMail (after using it for ~10 years) to Thunderbird [the why of the latter is a longer story I might tell some other time].

So, after not caring about email privacy for pretty long, I now got it all setup, although the setup on my laptop produces faulty inline PGP once in a while, where it doesn't even recognize signed content itself...

Anyway, what I want to discuss today is the email header. As you all know, it contains all sorts of information, even your IP-Address -- if you have a nasty provider. I kind of had the intuition that Thunderbird and Enigmail would reduce this info, or at least not add to it, but apparently that is not true. 
<!-- more -->

Stuff you normally transmit with every (signed) E-Mail:
  

**1) Thunderbird user agent** I was kind of confused by it, as I thought this information should go into the "X-Mailer" info, but obviously Mozilla has their own way, as you can see below. And it contains quite a bit of information, beside the mail client: My operating system, my windowing system, my cpu-architecture, even the Gecko-revision (what has that got to do with anything?). 


    
    User-Agent: Mozilla/5.0 (X11; FreeBSD i386; rv:10.0.3) Gecko/20120407 Thunderbird/10.0.3



**2) Enigmail user agent** Enigmail has its own client field, where it tells the world that it is installed on my system, and what version. Since Enigmail is specific to Thunderbird, this also tells people I am using Thunderbird (even if we get around 1) ).

    
     X-Enigmail-Version: 1.4



**3) GnuPG Identifier** Then, inside the PGP-Signature, GnuPG informs everyone of its version and my operating system:


    
     Version: GnuPG v2.0.19 (FreeBSD)



**4) Enigmail advertising** In case people hadn't noticed from 2) or the combination of 1) and 3), here comes Enigmail again:


    
    Comment: Using GnuPG with Mozilla - http://enigmail.mozdev.org/






Now, you might ask yourself why I worry about this information. Well first of all, it fulfills no real purpose. The receiving party doesn't act on this information and it doesn't need this information, as E-Mail is pretty standardized. **This alone should be reason enough not to transmit the information.** But here are some real scenarios:  

- If an attacker knows the applications you are using and even their versions, it might make it easier for him to send you prepared code that acts on certain known vulnerabilities of these application versions.  

- If you use more than one computer, people can identify which computer you wrote your E-Mail from based on different CPU-architectures, operating systems or application versions. This is less of an issue than the IP, but can still be used against you in different situations.



  

  




I didn't find any place that describes how to easily fix this, so I gathered the solutions from different web-sites and man-pages... to fix all of the above, go to _Edit->Preferences->Advanced->General->Config Editor_ and set these variables (they fix the above problems in the exact order):



    
    general.useragent.override=""
    extensions.enigmail.addHeaders=false
    extensions.enigmail.agentAdditionalParam="--no-emit-version"
    extensions.enigmail.useDefaultComment=true


The first two variables have to be created(string and bool), as they are non-default and there is no gui-way to set them. And yes the value for the last one is 'true'.

Hope this is usefull to some of you and saves you some googling or scroogling ;).
