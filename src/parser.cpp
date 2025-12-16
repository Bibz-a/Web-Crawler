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

// Function that parses href links from an HTML string
vector<string> parseHTML(const string& html) {

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

int main()
{
    return 0;
}