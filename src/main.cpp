#include <iostream>
#include <vector>
#include <set>
#include <curl/curl.h>
#include <windows.h>
#include "filehandler.h"
#include "parser.h"
#include "Graph.h"
using namespace std;

// ANSI color codes for console output
#define RESET   "\033[0m"
#define RED     "\033[31m"
#define GREEN   "\033[32m"
#define YELLOW  "\033[33m"
#define BLUE    "\033[34m"

// Enable ANSI escape sequences on Windows
void enableAnsiColors() {
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hOut == INVALID_HANDLE_VALUE) return;
    
    DWORD dwMode = 0;
    if (!GetConsoleMode(hOut, &dwMode)) return;
    
    dwMode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    SetConsoleMode(hOut, dwMode);
}

// Function to check if URL is already visited
bool isVisited(const set<string>& visited, const string& url) {
    return visited.find(url) != visited.end();
}

// Function to print all URLs discovered during crawl
void printAllUrls(const set<string>& visited) {
    cout << "\n" << BLUE << "========================================" << RESET << endl;
    cout << BLUE << "All Discovered URLs (" << visited.size() << " total)" << RESET << endl;
    cout << BLUE << "========================================" << RESET << "\n" << endl;
    
    int index = 1;
    for (const string& url : visited) {
        cout << index << ". " << url << endl;
        index++;
    }
    cout << "\n" << BLUE << "========================================" << RESET << endl;
}

// Function to print graph in tree-like format
void printGraphTree(Graph& graph, int nodeIndex, int depth, set<int>& printed, const string& prefix = "") {
    if (printed.find(nodeIndex) != printed.end()) {
        return; // Already printed to avoid cycles
    }
    
    printed.insert(nodeIndex);
    
    // Get URL for this node
    string url = graph.getUrl(nodeIndex);
    if (url.empty()) {
        return;
    }
    
    // Print current node
    if (depth == 0) {
        cout << (nodeIndex + 1) << ". " << url << endl;
    } else {
        cout << prefix << "└── " << url << endl;
    }
    
    // Get neighbors
    vector<int>& neighbors = graph.getNeighbors(nodeIndex);
    
    for (int i = 0; i < neighbors.size(); i++) {
        string newPrefix = prefix;
        if (depth > 0) {
            if (i == neighbors.size() - 1) {
                newPrefix += "    "; // Last child
            } else {
                newPrefix += "│   "; // Not last child
            }
        }
        printGraphTree(graph, neighbors[i], depth + 1, printed, newPrefix);
    }
}

// Recursive crawling function
void crawlRecursive(Graph& graph, const string& url, set<string>& visited, int maxDepth = 3, int currentDepth = 0) {
    // Check if we've exceeded max depth or already visited
    if (currentDepth > maxDepth || isVisited(visited, url)) { //Base condition
        return;
    }
    
    // Mark as visited
    visited.insert(url);
    cout << YELLOW << "[Crawling] Depth " << currentDepth << ": " << RESET << url << endl;
    
    // Add node to graph
    int currentNodeIndex = graph.addNode(url);
    
    // Fetch HTML content using filehandler
    string htmlContent = http_get(url);
    
    if (htmlContent.empty()) {
        cout << RED << "  [Error] Failed to fetch HTML content from " << url << RESET << endl;
        return;
    }
    
    cout << GREEN << "  [Success] Fetched " << htmlContent.length() << " bytes of HTML content." << RESET << endl;
    
    // Parse HTML to extract links
    vector<string> rawLinks = parseHTML(url, htmlContent);
    vector<string> extractedUrls = resolveAndFilterLinks(rawLinks, url);
    
    cout << "  [Found] " << extractedUrls.size() << " valid links" << endl;
    
    // Process each extracted URL - har new link is processed individually
    for (int i = 0; i < extractedUrls.size(); i++) {
        string linkedUrl = extractedUrls[i]; 
        
        // Add linked URL as a node
        int linkedNodeIndex = graph.addNode(linkedUrl);
        
        // Add directed edge from current node to linked node
        graph.addEdge(currentNodeIndex, linkedNodeIndex);
        
        // Recursively crawl the linked URL
        if (!isVisited(visited, linkedUrl)) {
            crawlRecursive(graph, linkedUrl, visited, maxDepth, currentDepth + 1);
        }
    }
}

int main() {
    // Enable ANSI color codes on Windows
    enableAnsiColors();
    
    curl_global_init(CURL_GLOBAL_ALL);
    
    // Starting URL
    string startUrl = "https://www.youtube.com";
    cout << "========================================" << endl;
    cout << "Web Crawler - Recursive Crawling" << endl;
    cout << "========================================" << endl;
    cout << "Starting URL: " << startUrl << endl;
    cout << "Max Depth: 3" << endl;
    cout << "========================================\n" << endl;
    
    // Create graph to store URLs and connections
    Graph graph;
    
    // Set to track visited URLs
    set<string> visited;
    
    // Start recursive crawling
    crawlRecursive(graph, startUrl, visited, 3, 0);
    
    cout << "\n" << GREEN << "========================================" << RESET << endl;
    cout << GREEN << "Crawling Complete!" << RESET << endl;
    cout << GREEN << "========================================" << RESET << endl;
    cout << "Total URLs discovered: " << visited.size() << endl;
    
    // Print all URLs discovered
    printAllUrls(visited);
    
    cout << "\nGraph Structure (Tree-like format):" << endl;
    cout << "========================================\n" << endl;
    
    // Print graph in tree-like format
    if (visited.size() > 0) {
        set<int> printed;
        // Find the starting node index
        int startIndex = graph.getIndex(startUrl);
        if (startIndex != -1) {
            printGraphTree(graph, startIndex, 0, printed);
        } else {
            // If start node not found, print all nodes
            graph.printGraph();
        }
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

