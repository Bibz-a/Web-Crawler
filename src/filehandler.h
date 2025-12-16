#ifndef FILEHANDLER_H
#define FILEHANDLER_H

#include <string>
using namespace std;
size_t write_to_string_callback(void *ptr, size_t size, size_t nmemb, void *userdata);
string http_get(const string& url);

#endif