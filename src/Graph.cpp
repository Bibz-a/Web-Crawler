#include <iostream>
#include <vector>
#include <string>
#include "Graph.h"
using namespace std;

// Prevent duplicate edges - helper hence private
bool Graph::edgeExists(int u, int v) {
    for (int x : adj[u]) {
        if (x == v)
            return true;
    }
    return false;
}

// Add URL node, return index
int Graph::addNode(const string& url) {
    int idx = getIndex(url);
    if (idx != -1)
        return idx; //alr added url

    urls.push_back(url);
    adj.push_back(vector<int>()); // add empty adjacency list

    return urls.size() - 1;    // return last index
}

// Add directed edge u -> v
void Graph::addEdge(int u, int v) {
    if (u < 0 || v < 0 || static_cast<size_t>(u) >= adj.size() || static_cast<size_t>(v) >= adj.size()) //check valid indices
        return;

    if (!edgeExists(u, v))
        adj[u].push_back(v); //directed graph edge
}

// Get neighbors of u
vector<int>& Graph::getNeighbors(int u) {
    return adj[u];
}

// URL -> index
int Graph::getIndex(const string& url) {
    for (size_t i = 0; i < urls.size(); i++) {
        if (urls[i] == url)
            return static_cast<int>(i);
    }
    return -1; //url isnt added yet
}

// Get URL by index
string Graph::getUrl(int index) {
    if (index < 0 || static_cast<size_t>(index) >= urls.size())
        return "";
    return urls[index];
}

// Get total number of nodes
int Graph::getNodeCount() {
    return static_cast<int>(urls.size());
}

// Debug print
void Graph::printGraph() {
    for (size_t i = 0; i < urls.size(); i++) {
        cout << urls[i] << " -> ";
        for (int v : adj[i]) {
            cout << urls[v] << " ";
        }
        cout << endl;
    }
}
