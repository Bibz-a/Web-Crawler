#ifndef CRAWL_RUNNER_H
#define CRAWL_RUNNER_H

#include <string>
#include <vector>

struct CrawlNode {
    std::string url;
    int depth;
    std::string parentUrl;
    bool failed;
};

struct CrawlEdge {
    std::string from;
    std::string to;
};

struct CrawlStatus {
    std::string state;
    int pagesCrawled;
    int queueSize;
    std::string currentUrl;
    int errors;
    long long elapsedMs;
    std::string seedUrl;
    int depth;
    std::string traversal;
    std::vector<CrawlNode> nodes;
};

struct CrawlResults {
    std::vector<CrawlNode> nodes;
    std::vector<CrawlEdge> edges;
};

bool runCrawl(
    const std::string& seedUrl,
    int maxDepth,
    bool useBfs,
    const std::string& statusPath,
    const std::string& stopPath,
    CrawlResults& results
);

void writeCrawlStatus(const std::string& path, const CrawlStatus& status);
void writeCrawlResults(const std::string& path, const CrawlResults& results);

#endif
