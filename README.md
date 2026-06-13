# WebCrawler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

CS-221 DSA project — a web crawler with custom queue, stack, hash map, and graph (BFS/DFS). Includes a **terminal C++ crawler** and a **web dashboard UI**.

## Run the web UI

**Requirements:** [Node.js](https://nodejs.org/) 18+

```bash
cd ui
npm install
node server.mjs
```

Open **http://localhost:8080** in your browser.

> Use `node server.mjs`, not `python -m http.server`. The UI needs the Node server for `/api/*` routes (sidebar stats, crawl state).

Optional env vars:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | Server port |
| `ALLOWED_ORIGIN` | `http://localhost:8080` | CORS origin (production) |

## Run the C++ crawler

**Requirements:** C++17 compiler, **libcurl**

From the repo root:

```bash
make
./webcrawler.exe
```

Manual build (Windows):

```bash
g++ -std=c++17 -Wall -g -Iinclude -o webcrawler.exe src/main.cpp src/parser.cpp src/Graph.cpp src/filehandler.cpp src/sorting.cpp src/hashmaps.cpp src/dynamicarray.cpp src/queue.cpp src/stack.cpp -lcurl
```

Use the numbered menu to crawl (BFS/DFS), view the spanning tree, sort URLs, search, and read `logs/fetcher.log`.

## Layout

```text
Web-Crawler/
├── include/ src/     # C++ crawler
├── ui/               # Web dashboard (HTML/CSS/JS + Node API)
├── data/ logs/       # Runtime output
├── Makefile
└── LICENSE
```

## Team

Labiba Ahmad (2024260) · Maimoona Saboor (2024270) · Qurat ulain (2024526)

MIT License — see [LICENSE](LICENSE).
