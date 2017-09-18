---
author: h2
comments: true
date: 2012-04-20 14:08:33+00:00

link: /post/2012/04/20/an-inside-view-on-the-great-chinese-firewall/
slug: an-inside-view-on-the-great-chinese-firewall
title: An inside view on the Great Chinese Firewall
wordpress_id: 61
categories:
- Random Nerdiness
---

As I am currently located in China, I thought I'd give all of you some technical infos on the current censorship techniques employed here. My experience differs a little from what [Wikipedia tells](http://en.wikipedia.org/wiki/Internet_censorship_in_the_People%27s_Republic_of_China#Current_methods) us. <!-- more -->

**What you see as a user:**
youtube.com, facebook.com, twitter.com are all not reachable. Google.com is on and off, usually redirects to google.com.hk (which is still the less censored version of google.cn). Google.de is however available. A nice site that lets you test which web-sites are unavailable is [http://www.greatfirewallofchina.org](http://www.greatfirewallofchina.org/), from my experience it is reliable.

Now funny enough all things political that I checked are available, be it critical (western) newspaper sites, blogs et cetera. Even Wikipedia is available. All sites that I checked, especially Wikipedia and Google.de do offer SSL (valid!) and so looking at https://en.wikipedia.org/wiki/Tiananmen_Square_protests_of_1989 is possible (note that some sources claim that the western propaganda on this event is at least [partly wrong](http://www.telegraph.co.uk/news/worldnews/wikileaks/8555142/Wikileaks-no-bloodshed-inside-Tiananmen-Square-cables-claim.html), so don't take this as defending the WP-article). Note also that I did not try without SSL, because I was told, that that would be detected and can get your internet service cut.

**Whats going on under the hood:**
Like I said, I did not experiment too much with entering sensitive terms in search engines, but regarding the web-site blocking I can say that 
	
* the DNS-Servers here resolve certain adresses to other IPs (obvious one). Strangely enough first neblock-owner checks reveal these IPs to be outside of China, even EU... will investigate this further.

	
* dns-requests to foreign (probably non-whitelisted) DNS-servers are either all rerouted (based on port or deep packet inspection), or filtered and manipulated in case the requested host matches a blacklist or an expression (based on deep packet inspection). So just setting a different DNS-Server is no good, even when they are not widely known (contrary to what WP says)

	
* traffic to the real IPs of the sites is blocked, so if you happen to know where twitter.com is, it still doesn't get you there. This is probably achieved by resetting the TCP connection. Note that this happens early on, a traceroute to twiiter only goes one hop before dissappearing.


  
  
  


I currently go online trough SSH port forwarding, tunneling and proxies, will update that to proper VPN, as soon as I get the time. Anything encrypted really works, no issues with ssh and https on regular ports. OpenVPN also works...
