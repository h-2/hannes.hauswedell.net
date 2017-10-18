---

author: h2
date: 2017-10-19 12:00:00+02:00

title: Using Gitea and/or Github to host blog comments
slug: 18/blog-comments

fsfe_commentid: 2
gh_commentid: 2

draft: true

categories:
- Meta
- Random Nerdiness

---

After moving from FSFE's wordpress instance I thought long about whether I still want to have comments on the new blog.
I think I have found a pretty good solution that I will document below.
<!--more-->

To be honest, Wordpress was a spam **nightmare**! I ended up excluding all non-FSFE-members, because it was just too difficult
to get right.
For privacy reasons I take great care to not impose external references to visitors of this site so I was kinda pessemistic...
but then I found something really cool:

http://donw.io/post/github-comments/

The post contains all the detail about the original idea and implementation. I have adapted the solution and changed the following:

  * In addition to GitHub, it now work with Gitea, too, specifically FSFE's instance.
  * The comments are not loaded automatically, but on-demand (so users don't automatically connect to GitHub)
  * It is possible to have multiple instances of the script running, with different target domains and/or users
