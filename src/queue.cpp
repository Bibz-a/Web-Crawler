// Queue is used for BFS (breadth first search) by the first in, first out principle
// addition done by rear pointer and removal by the front pointer

#include <iostream>
using namespace std;

struct QNode{
    int data;
    QNode* next;

    QNode(int d){
        data = d;
        next = nullptr;
    }
};

class Queue{
    private:
    QNode* front;
    QNode* rear;

    public:
    Queue(){
        front = rear = nullptr;
    }

    bool isEmpty(){
        return (rear == nullptr);
    }

    void enqueue(int v){
        QNode* newnode = new QNode (v);

        if (isEmpty()){
            front = rear = newnode;
        } else {
            rear->next = newnode;
            rear = newnode;
        }
    }

    int dequeue(){
        if (isEmpty()){
            cout << "Queue is empty\n";
            return -1;
        }

        QNode* temp = front;
        int v = front->data;

        front = front->next;

        if (front == nullptr)
            rear = nullptr;
        
        delete temp;
        return v;
    }

    // not really required acc to readme, but ill add it incase for now
    int peek(){
        if (isEmpty()){
            cout << "Queue is empty\n";
            return -1;
        }
        return front->data;
    }

    // not really required acc to readme, but ill add it incase for now
    void display(){
        if (isEmpty()){
            cout << "Queue is empty\n";
            return;
        }

        QNode* temp = front;

        while (temp != nullptr){
            cout << temp->data <<" ";
            temp = temp->next;
        } 
        cout << endl;
    }

};


// this is just for testing and making sure it works for now
int main(){

    return 0;
}