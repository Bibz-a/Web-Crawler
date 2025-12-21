#include <iostream>
#include <string>
#include <vector>
using namespace std;

void merge(vector<string>& arr, int str, int mid, int end)
{
    vector<string> temp(end - str + 1);

    int i = str;
    int j = mid + 1;
    int count = 0;

    while (i <= mid && j <= end)
    {
        if (arr[i] <= arr[j])    // alphabetical string comparison
            temp[count++] = arr[i++];
        else
            temp[count++] = arr[j++];
    }

    while (i <= mid)
        temp[count++] = arr[i++];

    while (j <= end)
        temp[count++] = arr[j++];

    for (int k = 0; k < temp.size(); k++)
        arr[str + k] = temp[k];
}

void mergesort(vector<string>& arr, int str, int end)
{
    if (str < end)
    {
        int mid = (str + end) / 2;
        mergesort(arr, str, mid);
        mergesort(arr, mid + 1, end);
        merge(arr, str, mid, end);
    }
}
