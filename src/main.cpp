#include <iostream>
#include <vector>
#include <set>
#include <string>
#include <iomanip>
#include <utility>
#include <cctype>
#include <curl/curl.h>
#include <windows.h>
#include "filehandler.h"
#include "parser.h"
#include "Graph.h"
#include "stack.h"
#include "queue.h"
#include "sorting.h"
using namespace std;

// ANSI color codes for console output
#define RESET       "\033[0m"
#define BOLD        "\033[1m"
#define RED         "\033[31m"
#define GREEN       "\033[32m"
#define YELLOW      "\033[33m"
#define BLUE        "\033[34m"
#define MAGENTA     "\033[35m"
#define CYAN        "\033[36m"
#define WHITE       "\033[37m"
#define BRIGHT_RED  "\033[91m"
#define BRIGHT_GREEN "\033[92m"
#define BRIGHT_YELLOW "\033[93m"
#define BRIGHT_BLUE "\033[94m"
#define BRIGHT_MAGENTA "\033[95m"
#define BRIGHT_CYAN "\033[96m"

// Enable ANSI escape sequences on Windows
void enableAnsiColors() {
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hOut == INVALID_HANDLE_VALUE) return;
    
    DWORD dwMode = 0;
    if (!GetConsoleMode(hOut, &dwMode)) return;
    
    dwMode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    SetConsoleMode(hOut, dwMode);
    
    // Set console output to UTF-8
    SetConsoleOutputCP(65001); // UTF-8 code page
}

// Print banner
void printBanner() {
    cout << "\n\n";
    cout << BRIGHT_CYAN << "=================================================================" << RESET << "\n";
    cout << BRIGHT_CYAN << "|" << RESET << "                                                               " << BRIGHT_CYAN << "|" << RESET << "\n";
    cout << BRIGHT_CYAN << "|" << RESET << BOLD << BRIGHT_YELLOW << "                         WEB CRAWLER                         " << RESET << BRIGHT_CYAN << "|" << RESET << "\n";
    cout << BRIGHT_CYAN << "|" << RESET << BOLD << BRIGHT_YELLOW << "                      INTERACTIVE CRAWLER                      " << RESET << BRIGHT_CYAN << "|" << RESET << "\n";
    cout << BRIGHT_CYAN << "|" << RESET << "                            " << BRIGHT_YELLOW << "🕷️" << RESET << "                            " << BRIGHT_CYAN << "|" << RESET << "\n";
    cout << BRIGHT_CYAN << "|" << RESET << "                                                               " << BRIGHT_CYAN << "|" << RESET << "\n";
    cout << BRIGHT_CYAN << "=================================================================" << RESET << "\n\n";
}

// Print section header
void printSectionHeader(const string& title) {
    cout << "\n" << BRIGHT_BLUE << title << RESET << "\n";
    cout << BRIGHT_BLUE << "-----------------------------------------------------------------" << RESET << "\n\n";
}

// Print menu
void printMenu() {
    cout << "\nMAIN MENU:\n";
    cout << "  1. Start Crawling (BFS or DFS)\n";
    cout << "  2. Display Spanning Tree\n";
    cout << "  3. View All Crawled URLs\n";
    cout << "  4. View Sorted URLs\n";
    cout << "  5. Exit\n";
    cout << "\nEnter your choice: ";
}

// Get user input for URL with error handling
string getUserUrl() {
    string url;
    while (true) {
        cout << "\nEnter the starting URL: ";
        getline(cin, url);
        
        // Remove leading/trailing whitespace
        while (!url.empty() && (url[0] == ' ' || url[0] == '\t')) {
            url.erase(0, 1);
        }
        while (!url.empty() && (url.back() == ' ' || url.back() == '\t')) {
            url.pop_back();
        }
        
        if (url.empty()) {
            cout << RED << "[Error] URL cannot be empty. Please try again." << RESET << endl;
            continue;
        }
        
        // Basic URL validation
        if (url.find("http://") != 0 && url.find("https://") != 0) {
            cout << RED << "[Error] URL must start with http:// or https://" << RESET << endl;
            continue;
        }
        
        break;
    }
    return url;
}

// Get user input for depth with error handling
int getUserDepth() {
    int depth;
    while (true) {
        cout << "Enter crawl depth (1-10): ";
        if (!(cin >> depth)) {
            // Invalid input (not a number)
            cout << RED << "[Error] Please enter a valid number." << RESET << endl;
            cin.clear();
            cin.ignore(10000, '\n');
            continue;
        }
        cin.ignore(); // Clear newline
        
        if (depth < 1 || depth > 10) {
            cout << RED << "[Error] Depth must be between 1 and 10." << RESET << endl;
            continue;
        }
        
        break;
    }
    return depth;
}

// Get traversal method with error handling
char getTraversalMethod() {
    char method;
    while (true) {
        cout << "\nChoose traversal method:\n";
        cout << "  B - Breadth First Search (BFS)\n";
        cout << "  D - Depth First Search (DFS)\n";
        cout << "Enter choice (B/D): ";
        cin >> method;
        cin.ignore(); // Clear newline
        
        method = toupper(method);
        if (method == 'B' || method == 'D') {
            break;
        }
        
        cout << RED << "[Error] Please enter 'B' for BFS or 'D' for DFS." << RESET << endl;
    }
    return method;
}

// BFS crawling function using custom Queue
void crawlBFS(Graph& graph, const string& startUrl, set<string>& visited, int maxDepth) {
    printSectionHeader("BFS Crawling Started");
    
    // Custom Queue for BFS
    Queue<pair<string, int>> q; // pair of (URL, depth)
    q.enqueue(make_pair(startUrl, 0));
    
    int startIndex = graph.addNode(startUrl);
    
    while (!q.empty()) {
        pair<string, int> current = q.dequeue();
        string url = current.first;
        int depth = current.second;
        
        // Skip if exceeded max depth or already visited
        if (depth > maxDepth || visited.find(url) != visited.end()) {
            continue;
        }
        
        // Mark as visited
        visited.insert(url);
        cout << "[BFS] Depth " << depth << ": " << url << endl;
        
        // Get current node index
        int currentNodeIndex = graph.getIndex(url);
        if (currentNodeIndex == -1) {
            currentNodeIndex = graph.addNode(url);
        }
        
        // Fetch HTML content
        string htmlContent = http_get(url);
        
        if (htmlContent.empty()) {
            cout << RED << "  [Error] Failed to fetch HTML content" << RESET << endl;
            continue;
        }
        
        // Parse HTML to extract links
        vector<string> rawLinks = parseHTML(url, htmlContent);
        vector<string> extractedUrls = resolveAndFilterLinks(rawLinks, url);
        
        // Add all links to queue for BFS
        for (const string& linkedUrl : extractedUrls) {
            int linkedNodeIndex = graph.addNode(linkedUrl);
            graph.addEdge(currentNodeIndex, linkedNodeIndex);
            
            // Enqueue if not visited and within depth limit
            if (visited.find(linkedUrl) == visited.end() && depth < maxDepth) {
                q.enqueue(make_pair(linkedUrl, depth + 1));
            }
        }
    }
}

// DFS crawling function using custom Stack
void crawlDFS(Graph& graph, const string& startUrl, set<string>& visited, int maxDepth) {
    printSectionHeader("DFS Crawling Started");
    
    // Custom Stack for DFS
    Stack<pair<string, int>> s; // pair of (URL, depth)
    s.push(make_pair(startUrl, 0));
    
    int startIndex = graph.addNode(startUrl);
    
    while (!s.empty()) {
        pair<string, int> current = s.pop();
        string url = current.first;
        int depth = current.second;
        
        // Skip if exceeded max depth or already visited
        if (depth > maxDepth || visited.find(url) != visited.end()) {
            continue;
        }
        
        // Mark as visited
        visited.insert(url);
        cout << "[DFS] Depth " << depth << ": " << url << endl;
        
        // Get current node index
        int currentNodeIndex = graph.getIndex(url);
        if (currentNodeIndex == -1) {
            currentNodeIndex = graph.addNode(url);
        }
        
        // Fetch HTML content
        string htmlContent = http_get(url);
        
        if (htmlContent.empty()) {
            cout << RED << "  [Error] Failed to fetch HTML content" << RESET << endl;
            continue;
        }
        
        // Parse HTML to extract links
        vector<string> rawLinks = parseHTML(url, htmlContent);
        vector<string> extractedUrls = resolveAndFilterLinks(rawLinks, url);
        
        // Push links to stack in reverse order for DFS (so first link is processed first)
        for (int i = extractedUrls.size() - 1; i >= 0; i--) {
            const string& linkedUrl = extractedUrls[i];
            int linkedNodeIndex = graph.addNode(linkedUrl);
            graph.addEdge(currentNodeIndex, linkedNodeIndex);
            
            // Push to stack if not visited and within depth limit
            if (visited.find(linkedUrl) == visited.end() && depth < maxDepth) {
                s.push(make_pair(linkedUrl, depth + 1));
            }
        }
    }
}

// Print all URLs discovered during crawl
void printAllUrls(const set<string>& visited) {
    printSectionHeader("All Discovered URLs (" + to_string(visited.size()) + " total)");
    
    int index = 1;
    for (const string& url : visited) {
        cout << setw(4) << index << ". " << url << endl;
        index++;
    }
}

// Print sorted URLs using merge sort
void printSortedUrls(const set<string>& visited) {
    if (visited.empty()) {
        cout << RED << "[Error] No URLs to sort." << RESET << "\n";
        return;
    }
    
    // Convert set to vector for sorting
    vector<string> urlVector;
    for (const string& url : visited) {
        urlVector.push_back(url);
    }
    
    // Sort using merge sort
    if (!urlVector.empty()) {
        mergesort(urlVector, 0, urlVector.size() - 1);
    }
    
    printSectionHeader("Sorted URLs (" + to_string(urlVector.size()) + " total) - Merge Sort");
    
    int index = 1;
    for (const string& url : urlVector) {
        cout << setw(4) << index << ". " << url << endl;
        index++;
    }
}

// Print graph in tree-like format (spanning tree)
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
    
    // Get neighbors first
    vector<int>& neighbors = graph.getNeighbors(nodeIndex);
    
    // Print current node
    if (depth == 0) {
        cout << "* " << url << endl;
    } else {
        cout << prefix << "+-- " << url << endl;
    }
    
    // Process neighbors
    for (int i = 0; i < neighbors.size(); i++) {
        string newPrefix = prefix;
        if (depth > 0) {
            if (i == neighbors.size() - 1) {
                newPrefix += "    "; // Last child
            } else {
                newPrefix += "|   "; // Not last child
            }
        }
        printGraphTree(graph, neighbors[i], depth + 1, printed, newPrefix);
    }
}

// Generate spanning tree using DFS
void generateSpanningTree(Graph& graph, Graph& spanningTree, int startIndex, set<int>& visited) {
    if (visited.find(startIndex) != visited.end()) {
        return;
    }
    
    visited.insert(startIndex);
    string url = graph.getUrl(startIndex);
    spanningTree.addNode(url);
    
    vector<int>& neighbors = graph.getNeighbors(startIndex);
    for (int neighbor : neighbors) {
        if (visited.find(neighbor) == visited.end()) {
            string neighborUrl = graph.getUrl(neighbor);
            int neighborIndex = spanningTree.addNode(neighborUrl);
            int currentIndex = spanningTree.getIndex(url);
            spanningTree.addEdge(currentIndex, neighborIndex);
            generateSpanningTree(graph, spanningTree, neighbor, visited);
        }
    }
}

int main() {
    // Enable ANSI color codes on Windows
    enableAnsiColors();
    
    curl_global_init(CURL_GLOBAL_ALL);
    
    printBanner();
    
    Graph graph;
    set<string> visited;
    string startUrl;
    int crawlDepth = 3;
    bool hasCrawled = false;
    
    int choice;
    do {
        printMenu();
        if (!(cin >> choice)) {
            cout << RED << "[Error] Please enter a valid number." << RESET << endl;
            cin.clear();
            cin.ignore(10000, '\n');
            continue;
        }
        cin.ignore(); // Clear newline
        
        switch(choice) {
            case 1: {
                // Get user inputs
                startUrl = getUserUrl();
                crawlDepth = getUserDepth();
                char method = getTraversalMethod();
                
                // Clear previous crawl data
                graph = Graph();
                visited.clear();
                hasCrawled = false;
                
                // Perform crawling based on method
                if (method == 'B') {
                    crawlBFS(graph, startUrl, visited, crawlDepth);
                } else {
                    crawlDFS(graph, startUrl, visited, crawlDepth);
                }
                
                hasCrawled = true;
                
                cout << "\n" << GREEN << "Crawling Complete!" << RESET << "\n";
                cout << GREEN << "Total URLs discovered: " << visited.size() << RESET << "\n\n";
                
                break;
            }
            
            case 2: {
                if (!hasCrawled) {
                    cout << RED << "[Error] Please crawl a website first (Option 1)!" << RESET << "\n";
                    break;
                }
                
                printSectionHeader("Spanning Tree of Crawled URLs");
                
                if (visited.empty()) {
                    cout << RED << "[Error] No URLs to display." << RESET << "\n";
                    break;
                }
                
                // Generate spanning tree
                Graph spanningTree;
                set<int> treeVisited;
        int startIndex = graph.getIndex(startUrl);
                
        if (startIndex != -1) {
                    generateSpanningTree(graph, spanningTree, startIndex, treeVisited);
                    
                    // Print spanning tree
                    set<int> printed;
                    printGraphTree(spanningTree, spanningTree.getIndex(startUrl), 0, printed);
        } else {
                    cout << RED << "[Error] Starting URL not found in graph!" << RESET << "\n";
                }
                
                break;
            }
            
            case 3: {
                if (!hasCrawled) {
                    cout << RED << "[Error] Please crawl a website first (Option 1)!" << RESET << "\n";
                    break;
                }
                
                printAllUrls(visited);
                break;
            }
            
            case 4: {
                if (!hasCrawled) {
                    cout << RED << "[Error] Please crawl a website first (Option 1)!" << RESET << "\n";
                    break;
                }
                
                printSortedUrls(visited);
                break;
            }
            
            case 5: {
                cout << "\nThank you for using Web Crawler! Goodbye!\n\n";
                break;
            }
            
            default: {
                cout << RED << "[Error] Invalid choice! Please enter 1-5." << RESET << "\n";
                break;
            }
        }
        
        if (choice != 5) {
            cout << "\nPress Enter to continue...";
            cin.get();
        }
        
    } while (choice != 5);
    
    // Cleanup curl
    curl_global_cleanup();
    
    return 0;
}
