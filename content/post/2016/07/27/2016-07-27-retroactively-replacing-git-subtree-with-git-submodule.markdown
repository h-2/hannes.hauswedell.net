---
author: h2
comments: true
date: 2016-07-27 13:38:26+00:00

link: /post/2016/07/27/retroactively-replacing-git-subtree-with-git-submodule/
slug: retroactively-replacing-git-subtree-with-git-submodule
title: Retroactively replacing git subtree with git submodule
wordpress_id: 461
categories:
- Random Nerdiness
---

Combining multiple git repositories today is rather common, although the means of doing so are far from perfect. Usually people use `git submodule` or `git subtree`. If you have used neither or are happy with either method this post is completely irrelevant to you. <!-- more -->

But maybe you decided to use `git subtree` and like me are rather unhappy with the choice. I will not discuss the upsides and downsides of either approach, I assume you want to change this, and you wish you could go back in time and make it right for all subsequent development. So this is what we are going to do :)

This was an exercise in git for me so I am sure more experienced people might know shortcuts, but since it took me quite some time to figure out right, I hope it is going to be helpful to others. **It is however strongly recommended to read the shell scripts and possibly adapt them to your situation. I will not be held responsible for any problems!**

It should be noted that by definition any changes in your git history will break current clones and forks of your repository so only do this if you are very sure what you are doing. And be nice and inform your users about this ASAP.


# Pre conditions






  * you have a git subtree, e.g. of a library, inside your repo and you want to replace it with git submodule


  * going back to a commit in your history you should still get the same version of the library that you had previously included with git subtree


  * i.e. every subtree update should be replaced with a submodule update of the same contents and also timestamp (because this is timetravel, right?)

  * all tags should be preserved / rewritten to their corresponding new IDs


  * when updating your git subtree previously you used the "squash" feature (if you didn't do this, it is going to be a lot harder)


  * you have a mostly straight branch history and are ok with loosing merge commits; all branches other than master will be rebased on master



When I say "preserve timestamp" it is important to clarify what this means: git has two notions of "timestamp", the "author date" and the "committer date".
The author date is the date where the commit was actually created. It is apparently entirely without relevance for git branches and their structure.
The committer date on the other hand is the time where the commit was included in the branch.
This is often the same, but when doing operations on a branch like cherry-picking or rebasing then it is overwritten with the current date.
Unfortunately git interfaces like github don't use either date consistently so if you want a consistent appearance you need to also preserve the committer dates.
Editing these however can have adverse effects potentially breaking branches or tags, because the correct chronological order of committer dates is important.
We will take extra precautions below, but if you branches somehow get mangeled, or a commit appears out of place with gitg than you should double check the committer dates.



# Preperation


Make a local clone of the repository and after that remove all your "remotes" with `git remote remove `. This ensures that you don't accidentally push any changes...

I assume that you have checked out the master branch and that you have exported the following environment variables:

```sh
CLONE="~/devel/myapp"                      # the directory of your clone
SUBDIR="include/mylib"                     # the subdir of the subtree/submodule relative to CLONE 
SUBNAME="mylib"                            # name of the submodule (can be anything)
SUBREPO="git://github.com/mylib/mylib.git" # submodules' repo
```    


ATTENTION: don't screw up any of the above paths since we might be calling rm -rf on them.

If you are uncomfortable with doing search and replace operations on the command line, you can set your editor to something easy like kwrite:
`
export EDITOR=kwrite
`



# Replacing the subtree and subtree updates



Since we are going to delete all the merge commits and also the commits that represent changes to the subtree, we need to remember at which places we later re-insert commits. To do this, run the following:

```sh
git log --format='%at:::%an:::%ae:::%s' --no-merges | awk -F ':::' '
(PRINT == 1) && !($4 ~ /^Squashed/) {
    PRINT=0
    printf    $1 ":::" $2    ":::" $3    ":::" $4   ":::"  # commit that we work on
    printf tTIME ":::" tNAME ":::" tMAIL ":::" tREF "\n"   # commit that we insert
};
(PRINT != 1) && ($4 ~ /^Squashed/) {
    PRINT=1
    tTIME=$1
    tNAME=$2
    tMAIL=$3
    tREF=substr($0, length($0) - 6, length($0)) # cut commit id from subj
}; ' > /tmp/refinserts
```



What it does is find for every commit that starts with "Squashed" the subsequent commit's subject and associate with it time of the subtree update and the subtree's commitID, seperated with "`:::`". We are paring this information with the subject line and not the commit ID, because the commit IDs in our branch are going to change! It also collapses subsequent updates to one. NOTE that if you have other commits that start wit "Squashed" in there subject line but don't belong to the subtree, instead filter for `Squashed '${SUBDIR}'` (beware of the quotes!!).

Now create a little helper script, e.g. as `/tmp/rebasehelper`:

```sh
#!/bin/sh

reset()
{
    TIME_NAME_MAIL_SUBJ=$(git log --format='%at:::%an:::%ae:::%s:::' -1)
    # next commit time is last commit time if not overwritten
    export GIT_AUTHOR_DATE=$(git log --format='%at' -1)
}

cp /tmp/refinserts /tmp/refinserts.actual
reset

while $(grep -q -F "${TIME_NAME_MAIL_SUBJ}" /tmp/refinserts.actual); do

    LINE=$(grep -F "${TIME_NAME_MAIL_SUBJ}" /tmp/refinserts.actual)
    export  GIT_AUTHOR_DATE=$(echo $LINE | awk -F ':::' '{ print $5 }')
    export  GIT_AUTHOR_NAME=$(echo $LINE | awk -F ':::' '{ print $6 }')
    export GIT_AUTHOR_EMAIL=$(echo $LINE | awk -F ':::' '{ print $7 }')
                        REF=$(echo $LINE | awk -F ':::' '{ print $8 }')

    if [ ! -d "${SUBDIR}" ]; then
        echo "** First commit with submodule, initializing..."
        git submodule --quiet add --force --name ${SUBNAME} ${SUBREPO} ${SUBDIR} > /tmp/rebasehelper.log
        [ $? -ne 0 ] && echo "** failed:" && cat /tmp/rebasehelper.log && break

        echo "** done."
    fi

    echo "** Updating submodule..."
    cd "${SUBDIR}"
    git checkout --quiet $REF > /tmp/rebasehelper.log
    [ $? -ne 0 ] && echo "** failed:" && cat /tmp/rebasehelper.log && break

    echo "** Committing changes..."
    cd ${CLONE}
    git commit --quiet -am "[${SUBNAME}] update to $REF" > /tmp/rebasehelper.log
    [ $? -ne 0 ] && echo "** failed:" && cat /tmp/rebasehelper.log && break

    echo "** Continuing rebase."
    rm /tmp/rebasehelper.log
    grep -v -F "${TIME_NAME_MAIL_SUBJ}" /tmp/refinserts.actual > /tmp/refinserts.new
    mv /tmp/refinserts.new /tmp/refinserts.actual
    git rebase --continue
    reset
done

if [ -d "${CLONE}/.git/rebase-merge" ] || [ -d "${CLONE}/.git/rebase-apply" ]; then
    echo "The current rebase step is not related to subtree-submodule operation or needs manual resolution."
    echo "Try 'git mergetool', followed by 'git rebase --continue' or just the latter."
fi
```



We will call this later.



## Filter-Tree



Now we actually remove references to the subtree from our history so that future operations create no conflicts:

```sh
git filter-branch --tree-filter 'rm -rf '"${SUBDIR}" HEAD
```    


This may take some time. Other sources recommend `--index-filter` but that will not work because the file-references in the subtree are not relative to our repository, but to the SUBDIR. If this command doesn't actually remove the directory, make sure to run `rm -rf "${SUBDIR}"`.



## Rebase



Now we do the rebase:

```sh
git rebase --interactive $(git log --format='%H' | tail -n 1)
```    



Which will open your commit history in the EDITOR that you configured. NOTE that this is in chronological order, not reverse chronological like the `git log` command.

In the editor you now want to remove all lines that contain "Squashed" and mark the previous commit for being edited. This is multiline-regex with substitution, but in kwrite this is very straightforward:

```sh
Search:  pick(.*\n).*Squashed.*\n
Replace: e \1
```    


This will only miss subsequent "double" updates which can safely be removed:

```sh
Search:  .*Squashed.*\n
Replace: 
```    



Save and close the editor, you will now be at the first commit that you are editing. This is the original point in time where you added your subtree, source the helper script with `. /tmp/rebasehelper`. If there were never any conflicts in your tree the script should run through completely and you are done. It is important to source the script with a leading . because it sets some environment variables also for your manual commits.

However, if you did have conflicts, you will be interrupted to resolve these manually, usually by `git mergetool` and then `git rebase --continue`. Whenever the rebase tells you "Stopped at...", just call `. /tmp/rebasehelper` again and keep repeating the last steps, until the rebase is finished. If you are doing the whole thing on multiple branches you might want to run `git rerere` before every `git mergetool`, it might save you some merge steps.

Unfortunately the rebase will set all commit dates to the current date (although the "author date" is preserved). There is a an option that prevents exactly this, but which cannot be used together with interactivity, because the interactivity introduces commits with a newer author date (which is okay in itself but committer dates need to be chronological for rebase). We write this little scriplet to /tmp/redate to help us out:

```sh
#!/bin/sh
git filter-branch --force --env-filter '
    LAST_DATE=$(cat /tmp/redate_old);
    GIT_COMMITTER_DATE=$( (echo $LAST_DATE; echo $GIT_AUTHOR_DATE) | awk '"'"'substr($1, 2) > MAX { MAX = substr($1, 2); LINE=$0}; END { print LINE }'"'"');
    echo $GIT_COMMITTER_DATE > /tmp/redate_old;
    export GIT_COMMITTER_DATE' $@
```    


What it does is set the COMMITTER_DATE to the AUTHOR_DATE unless the COMMITTER_DATE would be older than the last COMMITTER_DATE (which is illegal) -- in that case it uses the same COMMITTER_DATE as the previous commit. This ensures correct chronology while still having sensible dates in all cases.

And then we call the script with some pre and post commands:

```sh
echo '@0 +0000' > /tmp/redate_old
/tmp/redate
git log --format='%ad' --date=raw -1 | awk '{ print "@" $1+1 " " $2 }' > /tmp/redate_master  
```    


(initialization and saving master's final timestamp+1 for later)



## Multiple Branches



For all other affected branches it is now much simpler. First checkout the branch. If your subtree/submodule is large, you might have to delete ${SUBDIR} before that with `rm -rf`.

Then filter the tree as described above, you might need to add force to overwrite some backups:

```sh
git filter-branch -f --tree-filter 'rm -rf '"${SUBDIR}" HEAD
```    



Followed by a rebase on the already-fixed master branch:

```sh
git rebase --interactive master
```    


You should now see all diverging commits, plus all the "Squashed*" commits. If you did make subtree updates on other branches and you want to retain them, then apply the same mechanism as for the master branch. If subtree changes in the other branch are nor important, you can just remove all of them from the file.

Now the committer dates in the part of the branch that are identical to master are correct (because we fixed those earlier), but those in the new part have updated commit times. We can just use our previous scriptlet, but this time we initialize with the master's last timestamp and we only operate on the commits that are actually new:

```sh
cp /tmp/redate_master /tmp/redate_old
/tmp/redate_master master..HEAD
```    



voila, and repeat for the other branches!



# Rewiring the tags



Currently all your tags should still be there and also still be valid. Print them to a tmpfile and open them:

```sh
git tag -l > /tmp/oldtags
$EDITOR /tmp/oldtags
```    



Review the list of tags and remove all tags that belonged to the submodule or that you don't want to keep in the new repository from the file.

Now checkout master again, then run this nifty script (reed the note below first!):

```sh
#!/bin/sh

OLDIFS=$IFS
IFS='
'

TAGS=$(cat /tmp/oldtags)

for TAG_NAME in $TAGS; do
    IFS=$OLDIFS
    TAG_COMMIT=$(git for-each-ref --format="%(objectname)" refs/tags/${TAG_NAME})
    TAG_MESSAGE=$(git for-each-ref --format="%(contents)" refs/tags/${TAG_NAME})

    # the commit that is referenced by the annotated tag in the original branch
    ORIGINAL_COMMIT=$(git log --format='%H' --no-walk ${TAG_COMMIT})
    ORIGINAL_COMMIT_DATE=$(git log --format='%at' --no-walk ${ORIGINAL_COMMIT})
    ORIGINAL_COMMIT_SUBJECT=$(git log --format='%s' --no-walk ${ORIGINAL_COMMIT})
    # the same commit in our rewritten branch
    NEW_COMMIT=$(git log --format='%H:::%at:::%s' | awk -F ':::' '
    $2 == "'"$ORIGINAL_COMMIT_DATE"'" && $3 == "'"$ORIGINAL_COMMIT_SUBJECT"'" { print $1 }')

    # overwrite git environment variables directly:
    export GIT_COMMITTER_DATE=$(git for-each-ref --format="%(taggerdate:rfc)" refs/tags/${TAG_NAME})
    export GIT_COMMITTER_NAME=$(git for-each-ref --format="%(taggername)" refs/tags/${TAG_NAME})
    export GIT_COMMITTER_EMAIL=$(git for-each-ref --format="%(taggeremail)" refs/tags/${TAG_NAME})
    export GIT_AUTHOR_DATE=$GIT_COMMITTER_DATE
    export GIT_AUTHOR_NAME=$GIT_COMMITTER_NAME
    export GIT_AUTHOR_EMAIL=$GIT_COMMITTER_EMAIL

     # add the new tag
     git -c user.name="${GIT_COMMITTER_NAME}" -c user.email="${GIT_COMMITTER_EMAIL}" tag -f -a "${TAG_NAME}" -m "${TAG_MESSAGE}" $NEW_COMMIT

    IFS='
'
done
```    



NOTE that for this to work, all tags must be contained in the master branch (or whichever branch you are currently on.
If this is not the case, you need to create individual files with the tags of each branch and run this script repeatedly on the specific file while being on the corresponding branch.

NOTE2: This does assume that the COMMITTER_DATE of the tag will fit in at the place it is being added.
I am not sure if there are edge cases where one would have to double-check the committer date similarly to how we do it above...

Since your tags are all fixed, now would be a good time to checkout some of them and verify that your software builds, passes its unit checks et cetera.
Remember that in contrast to git subtree you need to manually reset your submodule via `submodule update` after you checkout the tag if you actually want the submodule's revision that belonged to the tag (which is the whole point of our exercise).



# Cleanup



Ok, so the new branches and tags are in place, but the folder is even bigger than before :o Now we get to clean up.

First make sure that absolutely nothing references the old stuff, i.e. delete all tags that you did not change in the previous step with `git tag -d`.
Also make sure that you have no remotes set. If in doubt, open a git-gui like gitk or gitg with the `--all` parameter and confirm that only your new trees are listed.

Then perform the actual clean-up:

```sh
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```



To double-check call something like `du -c .` in your directory and look at the output. You should now see that the big directories are all related to the submodule.



# Pushing the changes



Finally we will publish the changes. This is the part that is irreversible.
You can take extra pre-cautions by forking your upstream and pushing to the fork first, e.g. if your repository is at https://github.com/alice/myapp make a fork to https://github.com/alicia/myapp or something like that.

To work on alicia:

```sh
git remote add alicia git@github.com:alicia/myapp.git
   ``` 



In any case you need to delete all tags that are not in your local repository anymore.
If you decided to get rid of some branches locally, also remove them on the remote.
You can do this via the command line or github's interface (or gitlab or whatever). The command line for removing a remote tag is:

```sh
git push alicia :tagname
   ``` 



Also backup your releases, i.e. save the release messages and any downloads you added somewhere (I don't have an automatic way for that).

Then force push, including the updated tags:

```sh
git push --force --tags alicia master
   ``` 



Repeat the last step for every branch and look at your results! Do a fresh clone of the remote somewhere to verify that everything is right.
Github should have rewired your releases, to the updated tags, but if something went wrong, you can fix it through the web interface.

That was easy, right? :-)

If you have any ideas how to simplify this, please feel free to comment (FSFE account required) or reply on [Twitter](https://twitter.com/__h2__/status/758303895470895104).
