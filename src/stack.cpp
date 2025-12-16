// ===============================================
// Stack<T>  (Linked-List Implementation)

// Custom stack implementation (LIFO) used for DFS
// in the web crawler. STL is NOT used.
//
// Required Functions:
//   + void push(const T& value)
//   + T pop()
//   + bool empty() const
//   + int size() const
//
// Internal Structure:
//   Singly linked list: Node { T data; Node* next; }
//


// DFS (depth first search) is done by stack implementation ( last in, first out)
#include <iostream>
using namespace std;

struct SNode{
    int data;
    SNode* next;

    SNode(int d){
        data = d;
        next = nullptr;
    }
};

class Stack{
    private:
    SNode* top;

    public:
    Stack(){
        top = nullptr;
    }

    bool isEmpty(){
        return (top == nullptr);
    }

    void push(int v){
        SNode* newnode = new SNode(v);
        newnode->next = top;
        top = newnode;
    }

    int pop () {
        if (top == nullptr) {
            cout << "Stack is empty\n";
            return -1;
        }

        SNode* temp = top;
        int v = top->data;
        top = top->next;

        delete temp;
        return v;
    }

    int peek(){
        if (isEmpty()){
            cout << "Stack empty\n";
            return -1;
        }

        return (top->data);
    }

};

int main(){

    return 0;
}