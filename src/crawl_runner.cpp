#include "crawl_runner.h"

#include "Graph.h"
#include "HashMap.h"
#include "filehandler.h"
#include "parser.h"
#include "queue.h"
#include "stack.h"

#include <chrono>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <unordered_map>
#include <utility>

using namespace std;
namespace fs = std::filesystem;

static string jsonEscape(const string& value) {
    string out;
    out.reserve(value.size() + 8);
    for (char c : value) {
        switch (c) {
            case '\\': out += "\\\\"; break;
            case '"': out += "\\\""; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out += c; break;
        }
    }
    return out;
}

static bool shouldStopCrawl(const string& stopPath) {
    return !stopPath.empty() && fs::exists(stopPath);
}

void writeCrawlStatus(const string& path, const CrawlStatus& status) {
    fs::create_directories(fs::path(path).parent_path());

    ofstream out(path, ios::trunc);
    if (!out.is_open()) return;

    out << "{\n";
    out << "  \"status\": \"" << jsonEscape(status.state) << "\",\n";
    out << "  \"pagesCrawled\": " << status.pagesCrawled << ",\n";
    out << "  \"queueSize\": " << status.queueSize << ",\n";
    out << "  \"currentUrl\": \"" << jsonEscape(status.currentUrl) << "\",\n";
    out << "  \"errors\": " << status.errors << ",\n";
    out << "  \"elapsedMs\": " << status.elapsedMs << ",\n";
    out << "  \"seedUrl\": \"" << jsonEscape(status.seedUrl) << "\",\n";
    out << "  \"depth\": " << status.depth << ",\n";
    out << "  \"traversal\": \"" << jsonEscape(status.traversal) << "\",\n";
    out << "  \"nodes\": [\n";

    for (size_t i = 0; i < status.nodes.size(); i++) {
        const CrawlNode& node = status.nodes[i];
        out << "    {\n";
        out << "      \"url\": \"" << jsonEscape(node.url) << "\",\n";
        out << "      \"depth\": " << node.depth << ",\n";
        out << "      \"parentUrl\": "
            << (node.parentUrl.empty() ? "null" : "\"" + jsonEscape(node.parentUrl) + "\"")
            << ",\n";
        out << "      \"failed\": " << (node.failed ? "true" : "false") << "\n";
        out << "    }";
        if (i + 1 < status.nodes.size()) out << ",";
        out << "\n";
    }

    out << "  ]\n";
    out << "}\n";
}

void writeCrawlResults(const string& path, const CrawlResults& results) {
    fs::create_directories(fs::path(path).parent_path());

    ofstream out(path, ios::trunc);
    if (!out.is_open()) return;

    out << "{\n";
    out << "  \"nodes\": [\n";

    for (size_t i = 0; i < results.nodes.size(); i++) {
        const CrawlNode& node = results.nodes[i];
        out << "    {\n";
        out << "      \"url\": \"" << jsonEscape(node.url) << "\",\n";
        out << "      \"depth\": " << node.depth << ",\n";
        out << "      \"parentUrl\": "
            << (node.parentUrl.empty() ? "null" : "\"" + jsonEscape(node.parentUrl) + "\"")
            << ",\n";
        out << "      \"failed\": " << (node.failed ? "true" : "false") << "\n";
        out << "    }";
        if (i + 1 < results.nodes.size()) out << ",";
        out << "\n";
    }

    out << "  ],\n";
    out << "  \"edges\": [\n";

    for (size_t i = 0; i < results.edges.size(); i++) {
        const CrawlEdge& edge = results.edges[i];
        out << "    {\n";
        out << "      \"from\": \"" << jsonEscape(edge.from) << "\",\n";
        out << "      \"to\": \"" << jsonEscape(edge.to) << "\"\n";
        out << "    }";
        if (i + 1 < results.edges.size()) out << ",";
        out << "\n";
    }

    out << "  ]\n";
    out << "}\n";
}

static void appendNode(vector<CrawlNode>& nodes, const string& url, int depth, const string& parentUrl, bool failed) {
    nodes.push_back({ url, depth, parentUrl, failed });
}

static void writeLiveStatus(
    const string& statusPath,
    const string& state,
    const string& seedUrl,
    int maxDepth,
    const string& traversal,
    const chrono::steady_clock::time_point& startedAt,
    const string& currentUrl,
    int queueSize,
    int errors,
    const vector<CrawlNode>& nodes
) {
    auto elapsed = chrono::duration_cast<chrono::milliseconds>(
        chrono::steady_clock::now() - startedAt
    ).count();

    CrawlStatus status;
    status.state = state;
    status.pagesCrawled = static_cast<int>(nodes.size());
    status.queueSize = queueSize;
    status.currentUrl = currentUrl;
    status.errors = errors;
    status.elapsedMs = elapsed;
    status.seedUrl = seedUrl;
    status.depth = maxDepth;
    status.traversal = traversal;
    status.nodes = nodes;
    writeCrawlStatus(statusPath, status);
}

static void buildResultsFromGraph(Graph& graph, const vector<CrawlNode>& nodes, CrawlResults& results) {
    results.nodes = nodes;
    results.edges.clear();

    for (int u = 0; u < graph.getNodeCount(); u++) {
        string fromUrl = graph.getUrl(u);
        vector<int>& neighbors = graph.getNeighbors(u);
        for (int v : neighbors) {
            string toUrl = graph.getUrl(v);
            if (!fromUrl.empty() && !toUrl.empty()) {
                results.edges.push_back({ fromUrl, toUrl });
            }
        }
    }
}

static bool crawlBfs(
    Graph& graph,
    const string& startUrl,
    HashMap& visited,
    int maxDepth,
    const string& statusPath,
    const string& stopPath,
    const string& traversal,
    const chrono::steady_clock::time_point& startedAt,
    vector<CrawlNode>& nodes,
    int& errors
) {
    Queue<pair<string, int>> q;
    unordered_map<string, string> parentMap;
    q.enqueue(make_pair(startUrl, 0));
    graph.addNode(startUrl);

    while (!q.empty()) {
        if (shouldStopCrawl(stopPath)) {
            writeLiveStatus(statusPath, "stopped", startUrl, maxDepth, traversal, startedAt, "", q.size(), errors, nodes);
            return false;
        }

        pair<string, int> current = q.dequeue();
        string url = current.first;
        int depth = current.second;

        if (depth > maxDepth || visited.contains(url)) {
            continue;
        }

        visited.set(url, true);
        string parentUrl = depth == 0 ? "" : parentMap[url];

        writeLiveStatus(statusPath, "running", startUrl, maxDepth, traversal, startedAt, url, q.size(), errors, nodes);

        int currentNodeIndex = graph.getIndex(url);
        if (currentNodeIndex == -1) {
            currentNodeIndex = graph.addNode(url);
        }

        string htmlContent = http_get(url);
        bool failed = htmlContent.empty();
        if (failed) {
            errors++;
            appendNode(nodes, url, depth, parentUrl, true);
            writeLiveStatus(statusPath, "running", startUrl, maxDepth, traversal, startedAt, url, q.size(), errors, nodes);
            continue;
        }

        appendNode(nodes, url, depth, parentUrl, false);
        writeLiveStatus(statusPath, "running", startUrl, maxDepth, traversal, startedAt, url, q.size(), errors, nodes);

        vector<string> rawLinks = parseHTML(url, htmlContent);
        vector<string> extractedUrls = resolveAndFilterLinks(rawLinks, url);

        for (const string& linkedUrl : extractedUrls) {
            int linkedNodeIndex = graph.addNode(linkedUrl);
            graph.addEdge(currentNodeIndex, linkedNodeIndex);

            if (!visited.contains(linkedUrl) && depth < maxDepth) {
                parentMap[linkedUrl] = url;
                q.enqueue(make_pair(linkedUrl, depth + 1));
            }
        }
    }

    return true;
}

static bool crawlDfs(
    Graph& graph,
    const string& startUrl,
    HashMap& visited,
    int maxDepth,
    const string& statusPath,
    const string& stopPath,
    const string& traversal,
    const chrono::steady_clock::time_point& startedAt,
    vector<CrawlNode>& nodes,
    int& errors
) {
    Stack<pair<string, int>> s;
    unordered_map<string, string> parentMap;
    s.push(make_pair(startUrl, 0));
    graph.addNode(startUrl);

    while (!s.empty()) {
        if (shouldStopCrawl(stopPath)) {
            writeLiveStatus(statusPath, "stopped", startUrl, maxDepth, traversal, startedAt, "", s.size(), errors, nodes);
            return false;
        }

        pair<string, int> current = s.pop();
        string url = current.first;
        int depth = current.second;

        if (depth > maxDepth || visited.contains(url)) {
            continue;
        }

        visited.set(url, true);
        string parentUrl = depth == 0 ? "" : parentMap[url];

        writeLiveStatus(statusPath, "running", startUrl, maxDepth, traversal, startedAt, url, s.size(), errors, nodes);

        int currentNodeIndex = graph.getIndex(url);
        if (currentNodeIndex == -1) {
            currentNodeIndex = graph.addNode(url);
        }

        string htmlContent = http_get(url);
        bool failed = htmlContent.empty();
        if (failed) {
            errors++;
            appendNode(nodes, url, depth, parentUrl, true);
            writeLiveStatus(statusPath, "running", startUrl, maxDepth, traversal, startedAt, url, s.size(), errors, nodes);
            continue;
        }

        appendNode(nodes, url, depth, parentUrl, false);
        writeLiveStatus(statusPath, "running", startUrl, maxDepth, traversal, startedAt, url, s.size(), errors, nodes);

        vector<string> rawLinks = parseHTML(url, htmlContent);
        vector<string> extractedUrls = resolveAndFilterLinks(rawLinks, url);

        for (int i = static_cast<int>(extractedUrls.size()) - 1; i >= 0; i--) {
            const string& linkedUrl = extractedUrls[static_cast<size_t>(i)];
            int linkedNodeIndex = graph.addNode(linkedUrl);
            graph.addEdge(currentNodeIndex, linkedNodeIndex);

            if (!visited.contains(linkedUrl) && depth < maxDepth) {
                parentMap[linkedUrl] = url;
                s.push(make_pair(linkedUrl, depth + 1));
            }
        }
    }

    return true;
}

bool runCrawl(
    const string& seedUrl,
    int maxDepth,
    bool useBfs,
    const string& statusPath,
    const string& stopPath,
    CrawlResults& results
) {
    Graph graph;
    HashMap visited;
    vector<CrawlNode> nodes;
    int errors = 0;
    auto startedAt = chrono::steady_clock::now();
    string traversal = useBfs ? "BFS" : "DFS";

    fs::create_directories(fs::path(statusPath).parent_path());
    if (!stopPath.empty() && fs::exists(stopPath)) {
        fs::remove(stopPath);
    }

    writeLiveStatus(statusPath, "running", seedUrl, maxDepth, traversal, startedAt, seedUrl, 1, errors, nodes);

    bool completed = useBfs
        ? crawlBfs(graph, seedUrl, visited, maxDepth, statusPath, stopPath, traversal, startedAt, nodes, errors)
        : crawlDfs(graph, seedUrl, visited, maxDepth, statusPath, stopPath, traversal, startedAt, nodes, errors);

    buildResultsFromGraph(graph, nodes, results);

    string finalState = completed ? "complete" : "stopped";
    writeLiveStatus(statusPath, finalState, seedUrl, maxDepth, traversal, startedAt, "", 0, errors, nodes);
    return completed;
}
