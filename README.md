# Web-Crawler : Semester #03 Project for CS-221
# **WebCrawler – DSA Project**


##""THIS IS JUST INITIAL STUFF- MIGHT BE CHANGED AS WE GO ON!"


A lightweight web crawler built **from scratch**, using **custom data structures** (Graph, Queue, Stack, Sorting, FileHandler).  
No STL containers like `vector`, `queue`, `stack` are used—only dynamic arrays and linked lists implemented manually.

This crawler:
- Fetches a starting URL
- Extracts all outbound links
- Stores links in a custom Graph structure
- Traverses the graph using **BFS** or **DFS**
- Saves results in `/data` using FileHandler


---

# **How the System Works**

### **1. main.cpp**
- Loads the starting URL  
- Creates a Graph  
- Calls BFS or DFS from Graph  
- Sends HTML to Parser  
- Writes results using FileHandler  
- Prints final summary: number of pages visited, links extracted, crawl depth

---

### **2. Parser**
- Extracts URLs from raw HTML  
- Removes duplicates  
- Normalizes URLs  
- Returns a list of extracted links  

---

### **3. Graph**
- Implemented using adjacency lists (dynamic arrays or linked lists)  
- Functions:
  - `addNode(url)`
  - `addEdge(u, v)`
  - `getNeighbors(url)`
  - `BFS(startURL)`
  - `DFS(startURL)`

---

### **4. Queue (custom)**
Needed for **BFS**  
- Dynamic linked list implementation  
- Functions:
  - `enqueue(data)`
  - `dequeue()`
  - `isEmpty()`

### **5. Stack (custom)**
Needed for **DFS**  
- Dynamic linked list or array implementation  
- Functions:
  - `push(data)`
  - `pop()`
  - `isEmpty()`

---

### **6. Sorting**
Used to:
- Sort extracted links alphabetically before saving  
- Sort nodes for clean output  

---

### **7. FileHandler**
Manages:
- Saving crawled URLs  
- Storing graph adjacency lists  
- Writing summary logs  
- Saving sorted URLs  

---

# **Team Work Breakdown (Important)**

### ** Member 1 – Core Data Structures**
Responsible for:
- Queue (linked list)
- Stack (linked list or array)
- Sorting algorithms (Merge Sort / Quick Sort)
- Basic unit tests for these structures

**Note:**  
Complete these first — other modules depend on Queue & Stack. ****

---

### **Member 2 – Graph + Traversal**
Responsible for:
- Graph node storage  
- Edges implementation  
- URL → integer ID mapping  
- BFS (requires Queue)  
- DFS (requires Stack)  
- Communication with Parser  

**Advice:**  
 Build graph skeleton first, plug BFS/DFS later.

---

### **Team Member 3 – Parser + FileHandler + Integration**
Responsible for:
- Extracting URLs from HTML
- Removing duplicates
- Normalizing relative links  
- File writing (.txt, logs, results)
- Final integration inside `main.cpp`

**Advice:**  
Parser is the hardest part — start early.

---


### **Week 1**
- Queue, Stack completed  
- Graph structure defined  
- Basic HTML fetch logic tested  

### **Week 2**
- Parser implemented and tested  
- BFS/DFS fully working  
- Graph + Parser integration done  

### **Week 3**
- FileHandler and Sorting  
- Full pipeline: HTML → Parser → Graph  
- Debugging + cleanup  
- Documentation (README, comments, UML optional)

---

# ⚠️ **Crawling Safety**
- The crawler uses delays to avoid high request rates  
- Prevents accidental site overload  
- Follows basic ethical crawling guidelines

---

Date Started: 22/11/2025

Done by:
Labiba Ahmad - 2024260
Maimoona Saboor - 2024270
Qurat ulain - 2024526
