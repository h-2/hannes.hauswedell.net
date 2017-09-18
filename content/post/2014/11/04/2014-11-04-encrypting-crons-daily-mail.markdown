---
author: h2
comments: true
date: 2014-11-04 20:51:28+00:00

link: /post/2014/11/04/encrypting-crons-daily-mail/
slug: encrypting-crons-daily-mail
title: Encrypting cron's daily mail
wordpress_id: 342
categories:
- (Free) Software
- Random Nerdiness
---

Most you have probably set your system aliases to receive root's e-mail, and that of course is a very good idea so you are kept up to date. On the other hand you do send a lot of information about your system through the wire, often package diagnostics with information about locally installed vulnerable software and many other things that might help a person or entity gain access to your computer. Now living in a world, where we know that all unencrypted mail is automatically parsed and possibly filtered and stored that is something you might want to avoid. The natural answer is to encrypt the mail which is what I am going to explain in the following.

<!-- more -->

This HowTo pertains to FreeBSD in particular, but I am sure all you GNUsers out there will figure out the necessary changes for their system. A note of warning: I will not be redirecting all of root's mail, I will just be sending out the log files. If you want a more complete solution, you might want to check out [this](http://andsk.se/2014/09/17/encrypting-and-forwarding-local-email-to-an-external-email-address/). For my situation it definitely was overkill, as it involves installing and configuring a new MTA, new user accounts, some other unmaintained software…

First of all, get GnuPG from your ports or packages (security/gnupg) 
    
    pkg install security/gnupg

and add the public key of the receiver to your keyring: 
    
    gpg --import your_pkey.asc

I am doing this as `root`, but you can also setup an extra user for it or even use your regular account. As long as they are in the `wheel` group, the permissions should be fine. Double-check that the key was added correctly by printing the list of keys!

Next, tell your periodic script not to mail the log files to root, but instead save them to disk. Do so by appending the following lines to (or creating) `/etc/periodic.conf` :

    
    daily_output="/var/log/daily.log"
    daily_status_security_inline="YES"
    weekly_output="/var/log/weekly.log"
    weekly_status_security_inline="YES"
    monthly_output="/var/log/monthly.log"
    monthly_status_security_inline="YES"



Now paste the following text into `/root/bin/gpgcron.sh` :

    
    #!/bin/sh
    
    # verify argc
    [ $# -ne 1 ] && exit 1
    
    # verify argv
    [ $1 != "daily" ] &&  [ $1 != "weekly" ] && [ $1 != "monthly" ] \
     && exit 1
    
    LOG="/var/log/${1}.log"
    SENDER="something@valid.com"                # could be == $RECEIVER
    RECEIVER="your@email.address"               # duh.
    RECEIVER_KEY_ADDR="public.keys@address.com" # usually == $RECEIVER
    SUBJECT="${1} run on $(hostname -s)"        # could be something else
    
    cat "$LOG" | /usr/local/bin/gpg -e -a -r "$RECEIVER_KEY_ADDR" \
     --trust-model always --batch | mail -s "$SUBJECT" "$RECEIVER" \
    -f "$SENDER"


and don't forget to make the file executable. 

Verify that the script works by placing some random text in `/var/log/daily.log` (iff it doesn't exist) and running 

    
    /root/bin/gpgcron.sh daily


You should receive an encrypted mail now that your MUA will decrypt for you. If this works, the last step is adding the script to your `/etc/crontab`. I always have them run half an hour after the original script to make sure that it completed (although 5min might be enough):

    
    # Perform daily/weekly/monthly maintenance.
    1      3      *      *      *     root   periodic daily
    30     3      *      *      *     root   /root/bin/gpgcron.sh daily
    15     4      *      *      6     root   periodic weekly
    45     4      *      *      6     root   /root/bin/gpgcron.sh weekly
    30     5      1      *      *     root   periodic monthly
    1      6      1      *      *     root   /root/bin/gpgcron.sh monthly


(only the lines with gpgcron were added!)

Your next daily mail should come to you encrypted. Happy hacking!

edit: give the full path to GPG if your crontab overwrites $PATH
