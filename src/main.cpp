#include <iostream>
using namespace std;

int main() {
    //the source folder will be containing all the cpp code, this file connects all the code
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

