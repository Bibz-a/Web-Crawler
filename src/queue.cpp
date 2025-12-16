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

// Queue is used for BFS (breadth first search) by the first in, first out principle
// addition done by rear pointer and removal by the front pointer

#include <iostream>
using namespace std;

template <typename T>
struct QNode{
    T data;
    QNode<T>* next;

    QNode(const T& d){
        data = d;
        next = nullptr;
    }
};

template <typename T>
class Queue{
    private:
    QNode<T>* front;
    QNode<T>* rear;
    int count;

    public:
    Queue(){
        front = rear = nullptr;
        count =0;
    }

    bool empty() const{
        return (front == nullptr);
    }

    int size () const{
        return count;
    }

    void enqueue(const T& v){
        QNode<T>* newnode = new QNode<T> (v);

        if (empty()){
            front = rear = newnode;
        } else {
            rear->next = newnode;
            rear = newnode;
        }
        count++;
    }

    T dequeue(){
        if (empty()){
            return T();
        }

        QNode<T>* temp = front;
        T v = front->data;

        front = front->next;

        if (front == nullptr)
            rear = nullptr;
        
        delete temp;
        count--;
        return v;
    }

    // T peek(){
    //     if (isEmpty()){
    //         cout << "Queue is empty\n";
    //         return T();
    //     }
    //     return front->data;
    // }

    // void display(){
    //     if (isEmpty()){
    //         cout << "Queue is empty\n";
    //         return;
    //     }

    //     QNode<T>* temp = front;

    //     while (temp != nullptr){
    //         cout << temp->data <<" ";
    //         temp = temp->next;
    //     } 
    //     cout << endl;
    // }

    ~Queue(){
        while (!empty())
            dequeue();
    }

};

// this is just for testing and making sure it works for now
int main(){

    return 0;
}