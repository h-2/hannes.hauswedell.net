// Copyright © 2017 Don Williamson
// Copyright © 2017 Hannes Hauswedell
//
// MIT License
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the ""Software""), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// use of ajax vs getJSON for headers use to get markdown (body vs body_htmml)
// todo: pages, configure issue url, open in new window?

function ParseLinkHeader(link)
{
    if (link === null)
        return {};

    var entries = link.split(",");
    var links = { };
    for (var i in entries)
    {
        var entry = entries[i];
        var link = { };
        link.name = entry.match(/rel=\"([^\"]*)/)[1];
        link.url = entry.match(/<([^>]*)/)[1];
        link.page = entry.match(/page=(\d+).*$/)[1];
        links[link.name] = link;
    }
    return links;
}

function DoHostedComments(type,             // "github" or "gitea"
                          site,             // hostname of the instance
                          repo,             // repository as "user/repo"
                          element_prefix,   // prefix for elements defined outside (to hide/show)
                          comment_id,       // number of the issue that is being used
                          page_id)          // issue page (defaults to 1)
{
    if (page_id === undefined)
        page_id = 1;

    if (type === "github")
    {
        var api_url = "https://api." + site + "/repos/" + repo + "/issues/" + comment_id + "/comments?page=" + page_id;
    }
    else if (type === "gitea")
    {
        var api_url = "https://" + site + "/api/v1/repos/" + repo + "/issues/" + comment_id + "/comments?page=" + page_id;
        var converter = new showdown.Converter();
        converter.setFlavor('github');
    }
    else
    {
        // error
    }

    $(document).ready(function ()
    {
        $.ajax(api_url,
        {
            headers: {Accept: "application/vnd.github.v3.html+json"},
            dataType: "json",
            success: function(comments, textStatus, jqXHR) {

                // hide original load button
                $("#" + element_prefix + "-load-comments-box").hide();

                // Individual comments
                $.each(comments, function(i, comment) {

                    var date = new Date(comment.created_at);

                    if (type === "gitea")
                    {
                        // gitea doesn't have these
                        comment.user.html_url = "https://" + site + "/" + comment.user.login;
                        comment.body_html = converter.makeHtml(comment.body);
                    }

                    var t = "<div id='" + element_prefix + "-comment' >";
                    t += "<img src='" + comment.user.avatar_url + "' width='24px'>";
                    t += "<b><a href='" + comment.user.html_url + "'> " + comment.user.login + "</a></b>";
                    t += " posted at ";
                    t += "<em>" + date.toUTCString() + "</em>";
                    t += "<div id='" + element_prefix + "-comment-hr'></div>";
                    t += "<div id='commend-body' style='border:1px solid; padding: 8px; margin: 2px'>";
                    t += comment.body_html;
                    t += "</div></div><br>";
                    $("#" + element_prefix + "-comments-list").append(t);
                });
                if ($(comments).length === 0)
                {
                    $("#" + element_prefix + "-comments-list").append("<i>Be the first person to comment:</i>");
                }

                // Setup comments button if there are more pages to display
                var links = ParseLinkHeader(jqXHR.getResponseHeader("Link"));
                if ("next" in links)
                {
                    $("#" + element_prefix + "-load-comments-more").attr("onclick", "DoHostedComments(" + type + ","
                                                                                                        + site + ","
                                                                                                        + repo + ","
                                                                                                        + element_prefix + ","
                                                                                                        + comment_id + ","
                                                                                                        + (page_id + 1) + ");");
                    $("#" + element_prefix + "-load-comments-more").show();
                }
                else
                {
                    $("#" + element_prefix + "-load-comments-more").hide();
                }
            },
            error: function() {
                $("#" + element_prefix + "-comments-list").append("<i>Comments are not open for this post yet.</i>");
                $("#" + element_prefix + "-load-comments-box").hide();
                $("#" + element_prefix + "-post-comment-box").hide();
            }
        });
    });
}
