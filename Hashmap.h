#ifndef HASHMAP_H
#define HASHMAP_H

#include <iostream>
#include <string>
using namespace std;

class HashMap {
private:
    struct HashNode {
        string key;       // URL
        bool value;       // visited or not
        HashNode* next;

        HashNode(string k, bool v) {
            key = k;
            value = v;
            next = nullptr;
        }
    };

    static const int TABLE_SIZE = 1000;
    HashNode* table[TABLE_SIZE];

    int hashFunction(string key);

public:
    HashMap();
    ~HashMap();

    void set(string key, bool value);
    bool get(string key);
    bool contains(string key);
};

#endif 