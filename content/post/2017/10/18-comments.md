---

author: h2
date: 2017-10-21 18:00:00+02:00

title: Using Gitea and/or Github to host blog comments
slug: 21/blog-comments

fsfe_commentid: 1
gh_commentid: 1

<!-- draft: true -->

categories:
- Meta
- Random Nerdiness

---

After having moved from FSFE's wordpress instance I thought long about whether I still want to have comments on the new blog.
And how I would be able to do it with a statically generated site.
I think I have found/created a pretty good solution that I document below.
<!--more-->

## How it was before

To be honest, Wordpress was a spam **nightmare**! I ended up excluding all non-(FSFE-)members, because it was just too difficult
to get right. On the other hand I value feedback to posts so what to do?

This blog is now statically generated so it is not *designed* for comments anyway.
The most common solution seems to be [Disqus](https://disqus.com/) which seems to work well, but be a privacy nightmare.
It hosts your comments on their server and integrates with all sorts of authentication services, of course sharing data with them et cetera.
Not exposing my site visitors to tracking is very important to me and I also don't want to advertise using your Facebook login or some such nonsense.

## A good idea

However, I had vague memories of having read this article a while ago so I read up on it again:

http://donw.io/post/github-comments/

The idea is to host your comments in a GitHub bug tracker and load them dynamically via Javascript and the GitHub-API.
It integrates with GoHugo, the site-generator I am also using, so I thought I'd give it a try.
*Please read the linked article to get a clearer picture of the idea.*

## Privacy improvements and other changes

It all worked rather well, but there were a few things I was unhappy with so I changed the following:

  * In addition to GitHub, it now works with [Gitea](https://gitea.io/), a Free Software alternative, too;
  this includes dynamically generating Markdown from the comments via [ShowdownJS](https://github.com/showdownjs/showdown), because
  Gitea's API is less powerful than GitHub's.
  * The comments are not loaded automatically, but on-demand (so visitors don't automatically make requests to other servers).
  * It is possible to have multiple instances of the script running, with different server types, target domains and/or repos.
  * Gracefully degrade and offer external links if no Javascript is available.
  * Some visual changes to fit with my custom theme.

You can see the results below. I am quite happy with the solution as many of my previous readers from FSFE can still use FSFE's
infrastructure to reply (in this case FSFE's gitea instance).
I expect many other visitors to have a GitHub account so they don't need to sign up for another service.
I am aware this still relies on third parties and that GitHub may at some point commodify the use of its API, but right now it is much
better than to store and share the data with a company whose business model this already is. *And it is optional.*

And of course the blog itself will remain entirely free of Javascript!

The important files are available in this blog's repo:

  * [static/js/hosted-comments.js](https://git.fsfe.org/h2/hannes.hauswedell.net/src/master/static/js/hosted-comments.js)
  * [layouts/partials/comments.html](https://git.fsfe.org/h2/hannes.hauswedell.net/src/master/layouts/partials/comments.html)

What do you think? Feel free to adapt this for your blog and thanks to Don Williamson for the original implementation!
