// Queue<T>  (Linked-List Implementation) //template data type so its general purpose
// -----------------------------------------------
// Custom queue implementation (FIFO) used for BFS
// in the web crawler. STL is NOT used.
//
// Required Functions:
//   + void push(const T& value)       // enqueue
//   + T pop()                          // dequeue
//   + bool empty() const
//   + int size() const
//
// Internal Structure:
//   Singly linked list: Node { T data; Node* next; }

#include "queue.h"
// Queue is used for BFS (breadth first search) by the first in, first out principle
// addition done by rear pointer and removal by the front pointer

// Note: Template classes are fully defined in the header file (queue.h)
// This .cpp file is kept for documentation purposes only
