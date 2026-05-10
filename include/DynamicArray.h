#ifndef DYNAMICARRAY_H
#define DYNAMICARRAY_H

#include <iostream>
#include <stdexcept>
using namespace std;

template <typename T>
class DynamicArray {
    private:
    T* data;
    int sizee;
    int capacityy;

    void resize(){
        capacityy*=2;
        T* newdata = new T[capacityy];
        for (int i=0; i<sizee; i++){
            newdata[i] = data[i];
        }
        delete [] data;
        data = newdata;
    }

    public:
    DynamicArray(int initial_cap =2){
        if (initial_cap <=0)
            initial_cap = 2;
        data = new T[initial_cap];
        sizee =0;
        capacityy = initial_cap;
    }

    ~DynamicArray(){
        delete [] data;
    }

    void push_back(const T& val){
        if (sizee == capacityy)
            resize();
        
        data[sizee++] = val;
    }

    void pop_back() {
        if (sizee == 0) {
            throw out_of_range("empty array");
        }
        sizee--;
    }

    // Access element with boundary check
    T& operator[](int index) {
        if (index < 0 || index >= sizee) {
            throw out_of_range("Index out of range");
        }
        return data[index];
    }

    // Access element as const
    // const T& operator[](int index) const {
    //     if (index < 0 || index >= sizee) {
    //         throw out_of_range("Index out of range");
    //     }
    //     return data[index];
    // }

    int size() const {
        return sizee;
    }

    int capacity () const {
        return capacityy;
    }

};

#endif