#ifndef GRAPH_H
#define GRAPH_H

#include <vector>
#include <string>
using namespace std;

class Graph {
private:
    vector<string> urls;            
    vector<vector<int>> adj;       

    bool edgeExists(int u, int v);

public:
    
    int addNode(const string& url);

    
    void addEdge(int u, int v);

   
    vector<int>& getNeighbors(int u);

    
    int getIndex(const string& url);

    // Get URL by index
    string getUrl(int index);
    
    // Get total number of nodes
    int getNodeCount();
    
    void printGraph();
};

#endif
