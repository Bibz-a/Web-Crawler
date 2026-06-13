# Web crawler — build from repo root:  make
# Requires: g++ with C++17, libcurl (-lcurl)

CXX      := g++
CXXFLAGS := -std=c++17 -Wall -Wextra -g -Iinclude
LDFLAGS  := -lcurl

# mergesort.cpp defines the same symbols as sorting.cpp; keep one implementation
SRC := \
	src/main.cpp \
	src/parser.cpp \
	src/Graph.cpp \
	src/filehandler.cpp \
	src/sorting.cpp \
	src/hashmaps.cpp \
	src/dynamicarray.cpp \
	src/queue.cpp \
	src/stack.cpp

TARGET := webcrawler
CLI_TARGET := webcrawler_cli

CRAWL_SRC := \
	src/crawl_runner.cpp \
	src/parser.cpp \
	src/Graph.cpp \
	src/filehandler.cpp \
	src/hashmaps.cpp \
	src/queue.cpp \
	src/stack.cpp

.PHONY: all clean cli

all: $(TARGET)

cli: $(CLI_TARGET)

$(TARGET): $(SRC)
	$(CXX) $(CXXFLAGS) -o $@ $(SRC) $(LDFLAGS)

$(CLI_TARGET): src/crawl_cli.cpp $(CRAWL_SRC)
	$(CXX) $(CXXFLAGS) -o $@ src/crawl_cli.cpp $(CRAWL_SRC) $(LDFLAGS)

clean:
	rm -f $(TARGET) $(TARGET).exe $(CLI_TARGET) $(CLI_TARGET).exe
