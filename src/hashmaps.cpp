#include "HashMap.h"

#include <iostream>
using namespace std;

// Hash function
int HashMap::hashFunction(string key) {
    unsigned long hash = 5381; // so we can store long numbers properly.
    for (int i = 0; i < key.length(); i++) {
        hash = ((hash << 5) + hash) + key[i]; // hash * 33 + c. shift by 5 is multiplying by 2^5 basically, and add a hash, so its 33
    }
    return hash % TABLE_SIZE;
}

// Cons
HashMap::HashMap() {
    for (int i = 0; i < TABLE_SIZE; i++)
        table[i] = nullptr;
}

// Dest
HashMap::~HashMap() {
    for (int i = 0; i < TABLE_SIZE; i++) {
        HashNode* curr = table[i];
        while (curr != nullptr) {
            HashNode* temp = curr;
            curr = curr->next;
            delete temp;
        }
    }
}

// Set key-value
void HashMap::set(string key, bool value) {
    int index = hashFunction(key);
    HashNode* curr = table[index];

    while (curr != nullptr) {
        if (curr->key == key) {
            curr->value = value; // if hte value i already there, just update the value
            return;
        }
        curr = curr->next;
    }

    HashNode* newNode = new HashNode(key, value); // if value is not htere, add another node at the head
    newNode->next = table[index];
    table[index] = newNode;
}

// get value by the url
bool HashMap::get(string key) {
    int index = hashFunction(key);
    HashNode* curr = table[index];

    while (curr != nullptr) {
        if (curr->key == key)
            return curr->value;
        curr = curr->next;
    }
    return false;
}

// to csheck if key exists
bool HashMap::contains(string key) {
    int index = hashFunction(key);
    HashNode* curr = table[index];

    while (curr != nullptr) {
        if (curr->key == key)
            return true;
        curr = curr->next;
    }
    return false;
}

// Get the number of keys in the hashmap
int HashMap::size() {
    int count = 0;
    for (int i = 0; i < TABLE_SIZE; i++) {
        HashNode* curr = table[i];
        while (curr != nullptr) {
            count++;
            curr = curr->next;
        }
    }
    return count;
}

// Get all keys from the hashmap
vector<string> HashMap::getAllKeys() {
    vector<string> keys;
    for (int i = 0; i < TABLE_SIZE; i++) {
        HashNode* curr = table[i];
        while (curr != nullptr) {
            keys.push_back(curr->key);
            curr = curr->next;
        }
    }
    return keys;
}