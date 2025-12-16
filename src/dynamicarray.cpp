// DynamicArray<T>
// -----------------------------------------------
// Simple resizable array used instead of stl 
// Used for adjacency lists in Graph.
//
// Required Functions:
//   + void push_back(const T& value)
//   + void pop_back()
//   + T& operator[](int index)
//   + int size() const
//   + void resize()  // grows capacity x2
//
// Internal Data:
//   T* data
//   int size, capacity
//
// : Implement boundary checks

#include <iostream>
#include <stdexcept>
using namespace std;

template <typename T>
class DynamicArray {
    private:
    T* data;
    int size;
    int cap;

    void resize(){
        cap*=2;
        T* newdata = new 

    }

};