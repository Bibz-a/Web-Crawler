
// Graph  (Adjacency List Implementation)
// -----------------------------------------------
// Graph storing URLs as nodes and hyperlinks as edges.
// Uses DynamicArray for adjacency list storage.
// STL containers NOT allowed.
//
// Required Functions:
//   + int addNode(const string& url)
//       -> Adds a URL, returns node index.
//   + void addEdge(int u, int v)
//       -> Add directed edge from u -> v.
//   + DynamicArray<int>& getNeighbors(int u)
//       -> Returns list of links from node u.
//   + int getIndex(url)
//       -> Map URL to node index.
//
// Internal Notes:
//   - Maintain a separate DynamicArray<string> for URLs.
//   - Optionally add a hash function for URL lookup.
//
// TODO: Prevent duplicate edges.
// ===============================================
