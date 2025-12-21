#ifndef QUEUE_H
#define QUEUE_H

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
        count = 0;
    }

    bool empty() const{
        return (front == nullptr);
    }

    int size() const{
        return count;
    }

    void enqueue(const T& v){
        QNode<T>* newnode = new QNode<T>(v);

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

    ~Queue(){
        while (!empty())
            dequeue();
    }
};

#endif

