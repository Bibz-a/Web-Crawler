#ifndef STACK_H
#define STACK_H

#include <iostream>
using namespace std;

template <typename T>
struct SNode{
    T data;
    SNode<T>* next;

    SNode(const T& d){
        data = d;
        next = nullptr;
    }
};

template <typename T>
class Stack{
    private:
    SNode<T>* top;
    int count;

    public:
    Stack(){
        top = nullptr;
        count =0;
    }

    bool empty() const{
        return (top == nullptr);
    }

    int size() const {
        return count;
    }

    void push(const T& v){
        SNode<T>* newnode = new SNode<T>(v);
        newnode->next = top;
        top = newnode;
        count++;
    }

    T pop () {
        if (top == nullptr) {
            return T();
        }

        SNode<T>* temp = top;
        T v = top->data;
        top = top->next;

        delete temp;
        count--;
        return v;
    }

    T peek() const{
        if (empty()){
            cout << "Stack empty\n";
            return T();
        }

        return (top->data);
    }

    ~Stack(){
        while (!empty())
            pop();
    }

};

#endif