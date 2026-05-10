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

#include "DynamicArray.h"

// Note: Template classes are fully defined in the header file (DynamicArray.h)
// This .cpp file is kept for documentation purposes only