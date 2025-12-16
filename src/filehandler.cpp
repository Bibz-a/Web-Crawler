#include <iostream> 
#include <cstdio> 
#include <curl/curl.h>
#include <string>
#include <sstream> // Needed for stringstream
using namespace std; 

/* lib curl doesnt load direct HTML code, it loads data in chunks, each time new chunk arrives this function is called*/
size_t write_to_string_callback(void *ptr, size_t size, size_t nmemb, void *userdata) { //user data is a pointer to our string
    size_t total_size = size * nmemb;
    string* buffer = static_cast<string*>(userdata); //pointer turned back into string
    buffer->append(static_cast<char*>(ptr), total_size); //append the new chunk to the string
    return total_size; //returns the size of bytes written
}


string http_get(const string& url) {
    CURL* curl;
    CURLcode result; //error code
    string response_data; // This will hold the downloaded HTML

    //Starting the curl API session
    curl_global_init(CURL_GLOBAL_NOTHING); 
    curl = curl_easy_init(); //request object

    if(curl == NULL){
        cerr << "HTTP request failed: Could not initialize curl handle." << endl;
        return ""; 
    }

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());  //set target URL where to go
    
    // tells curl to use our callback function to write data
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_to_string_callback); 
    
    //tells curl that this is the pointer to pass to the write data function
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_data); 
  

    // Perform the request
    result = curl_easy_perform(curl);

    // Check for errors
    if(result != CURLE_OK) {
        cerr << "curl_easy_perform() failed: " << curl_easy_strerror(result) << endl;
        response_data.clear();
    }

    // Clean up and end session
    curl_easy_cleanup(curl);
    
    //return downloaded HTML stuff
    return response_data;
}


int main()
{
    return 0;
}