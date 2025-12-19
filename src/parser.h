#ifndef PARSER_H
#define PARSER_H

#include <string>
#include <vector>
using namespace std;

// Extract raw href links from HTML
vector<string> parseHTML(const string& baseUrl, const string& html);

// Validate and resolve relative URLs to absolute URLs
vector<string> resolveAndFilterLinks(const vector<string>& rawLinks, const string& baseUrl);

#endif

