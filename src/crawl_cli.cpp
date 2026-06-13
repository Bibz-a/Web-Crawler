#include "crawl_runner.h"

#include <curl/curl.h>
#include <filesystem>
#include <iostream>
#include <string>

using namespace std;
namespace fs = std::filesystem;

static void printUsage() {
    cerr << "Usage: webcrawler_cli --url <seed> --depth <n> --traversal BFS|DFS "
            "--status <path> --results <path> [--stop <path>]\n";
}

int main(int argc, char* argv[]) {
    string seedUrl;
    string traversal = "BFS";
    string statusPath;
    string resultsPath;
    string stopPath;
    int depth = 3;

    for (int i = 1; i < argc; i++) {
        string arg = argv[i];
        if (arg == "--url" && i + 1 < argc) {
            seedUrl = argv[++i];
        } else if (arg == "--depth" && i + 1 < argc) {
            depth = stoi(argv[++i]);
        } else if (arg == "--traversal" && i + 1 < argc) {
            traversal = argv[++i];
        } else if (arg == "--status" && i + 1 < argc) {
            statusPath = argv[++i];
        } else if (arg == "--results" && i + 1 < argc) {
            resultsPath = argv[++i];
        } else if (arg == "--stop" && i + 1 < argc) {
            stopPath = argv[++i];
        } else {
            printUsage();
            return 1;
        }
    }

    if (seedUrl.empty() || statusPath.empty() || resultsPath.empty()) {
        printUsage();
        return 1;
    }

    if (depth < 1) depth = 1;
    if (depth > 10) depth = 10;

  fs::create_directories("logs");
  fs::create_directories("data");

    curl_global_init(CURL_GLOBAL_ALL);

    bool useBfs = traversal != "DFS" && traversal != "dfs";
    CrawlResults results;

    bool completed = runCrawl(seedUrl, depth, useBfs, statusPath, stopPath, results);
    writeCrawlResults(resultsPath, results);

    curl_global_cleanup();
    return completed ? 0 : 2;
}
