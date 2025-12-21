// ===============================================
// Parser
// -----------------------------------------------
// Extracts hyperlinks from HTML source code and
// returns a list of cleaned, normalized URLs.
//
// Required Functions:
//   + vector<string> extractLinks(const string& html)
//   + string resolveUrl(const string& base, const string& link)
//   + bool isValidLink(const string& url)
//
// Notes:
//   - Remove 'javascript:' and 'mailto:' links.
//   - Convert relative URLs → absolute URLs.
//   - Filtering duplicates is optional.
//
// TODO: Improve regex for <a href=""> extraction.
#include <iostream>
#include <regex>
#include <string>
#include <vector>

using namespace std;

bool isValidLink(const string& link)
{
    // Empty link
    if (link.empty())
        return false;

    // Ignore anchors like "#top"
    if (link[0] == '#')
        return false;

    // Ignore JavaScript links
    if (link.find("javascript:") == 0)
        return false;

    // Ignore email links
    if (link.find("mailto:") == 0)
        return false;

    return true;   // otherwise, keep it
}


string resolveUrl(string base, string link)
{
    // Absolute link → return as is
    if (link.find("http://") == 0 || link.find("https://") == 0)
        return link;

    // Root-relative link
    if (!link.empty() && link[0] == '/')
    {
        string origin = "";
        int slashCount = 0;

        for (int i = 0; i < base.length(); i++)
        {
            origin += base[i];

            if (base[i] == '/')
                slashCount++;

            // After "https://example.com/" → stop
            if (slashCount == 3)
                break;
        }

        // remove trailing '/'
        if (!origin.empty() && origin.back() == '/')
            origin.pop_back();

        return origin + link;
    }

  // Relative link (about.html)
    int schemePos = base.find("://");
    int afterScheme = (schemePos == string::npos) ? 0 : schemePos + 3;

    int firstSlashAfterDomain = base.find("/", afterScheme);
    int lastSlash = base.find_last_of('/');

    // base is just domain: https://example.com
    if (firstSlashAfterDomain == string::npos)
        return base + "/" + link;

    // base has path: https://example.com/folder/page.html
    string baseDir = base.substr(0, lastSlash + 1);
    return baseDir + link;
}

vector<string> resolveAndFilterLinks(
    const vector<string>& rawLinks,
    const string& baseUrl)
{
    vector<string> finalLinks;

    for (int i = 0; i < rawLinks.size(); i++)
    {
        // Step 1: validate
        if (isValidLink(rawLinks[i]))
        {
            // Step 2: resolve
            string resolved = resolveUrl(baseUrl, rawLinks[i]);

            // Step 3: store
            finalLinks.push_back(resolved);
        }
    }

    return finalLinks;
}


// Function that parses href links from an HTML string
vector<string> parseHTML(const string& baseUrl,const string& html) {

    regex hrefRegex("href\\s*=\\s*\"([^\"]*)\"");
    smatch match;

    vector<string> urls;   // list to store URLs
    int pos = 0;

    while (regex_search(html.begin() + pos, html.end(), match, hrefRegex))
    {

        urls.push_back(match[1]);   // save URL

        pos += match.position() + match.length();
    }

    return urls;   // return the list
}
// main() removed - using main.cpp instead