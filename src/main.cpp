#include <iostream>
#include <vector>
#include <curl/curl.h>
#include "filehandler.h"
#include "parser.h"
using namespace std;

int main() {
   
    curl_global_init(CURL_GLOBAL_ALL);
    
   
    string startUrl = "https://www.example.com";
    cout << "Fetching URL: " << startUrl << endl;
    
    // Call to filehandler.cpp
    string htmlContent = http_get(startUrl);
    
    if (htmlContent.empty()) {
        cout << "Error: Failed to fetch HTML content from " << startUrl << endl;
        curl_global_cleanup();
        return 1;
    }
    
    cout << "Successfully fetched " << htmlContent.length() << " bytes of HTML content." << endl;
    cout << "Parsing now" << endl;
    
    
    vector<string> rawLinks = parseHTML(startUrl, htmlContent);
    cout << "Found " << rawLinks.size() << " raw links in HTML." << endl;
    
   
    vector<string> extractedUrls = resolveAndFilterLinks(rawLinks, startUrl);
    
    
    cout << "Extracted URLs " << extractedUrls.size() << " valid links"  << endl;
    for (int i = 0; i < extractedUrls.size(); i++) {
        cout << (i + 1) << ". " << extractedUrls[i] << endl;
    }
    
    if (extractedUrls.empty()) {
        cout << "No valid URLs were extracted." << endl;
    }
    
    // Cleanup curl
    curl_global_cleanup();
    
    return 0;
}

// main.cpp
// -----------------------------------------------------------
// Entry point for the Web Crawler project.
//
// This file controls:
//   - Program initialization
//   - User input (start URL, crawl mode, crawl limit)
//   - Calling BFS or DFS crawling functions
//   - Managing visited URLs
//   - Building the graph using custom data structures
//
// Data Structures Used:
//   - Queue (for BFS traversal)
//   - Stack (for DFS traversal)
//   - Graph (to store URL link structure)
//   - Sorting module (to sort results before saving)
//
// External Modules:
//   - Parser: Extracts links from downloaded HTML
//   - FileHandler: Fetches HTML pages and writes output files
//
// NOTE:
//   BFS/DFS logic is implemented HERE because this file
//   orchestrates the traversal of the web graph using the
//   custom data structures built from scratch.

