#include <iostream> 
#include <cstdio> 
#include <curl/curl.h>
#include <string>
#include <fstream>
#include <ctime>
#include <sstream> 
using namespace std; 

void append_to_log(const string&url, size_t byte_count)
{
  time_t now = time(0);
  string dt = ctime(&now);

  if(!dt.empty() && dt.back() == '\n') {
      dt.pop_back(); // Remove trailing newline
  }


  ofstream logfile("fetcher.log", ios::app);

  if(logfile.is_open()){
        logfile << "[" << dt << "] ";
        logfile << "URL: " << url;
        logfile << " | Size: " << byte_count << " bytes";
        logfile << "\n";
        logfile.close();
  }
  else{
    cerr<<"Error: Could not open log file for writing."<<endl;
  }
}
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
    //curl_global_init(CURL_GLOBAL_NOTHING); WHENEVER U USE THIS FUNCTION PASTE THIS LINE BEFOREHAND AND CALL CLEANUP TOO
    curl = curl_easy_init(); //request object

    if(curl == NULL){
        cerr << "HTTP request failed: Could not initialize curl handle." << endl;
        append_to_log(url, 0); //FAILURE
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
        append_to_log(url, 0);
    }
    else{
      append_to_log(url, response_data.length());
    }

    // Clean up and end session
    curl_easy_cleanup(curl);
    
    //return downloaded HTML stuff
    return response_data;
}

//g++ filehandler.cpp -o curl_fetch -lcurl
// .\curl_fetch.exe

// int main()
// {
//    
//     curl_global_init(CURL_GLOBAL_ALL); 
    
//     
//     const string success_url = "https://www.example.com";
//     const string failure_url = "http://bad-url-does-not-exist.com"; // Should fail DNS resolution

//     cout << "--- Starting Fetcher Test ---" << endl;
    
//     
//     cout << "Attempting SUCCESSFUL fetch for: " << success_url << endl;
//     string html_success = http_get(success_url);
    
//     if (!html_success.empty()) {
//         cout << "SUCCESS: Downloaded " << html_success.length() << " bytes." << endl;
//         // Optionally save the result to a file:
//         // ofstream outfile("example.html");
//         // outfile << html_success;
//     } else {
//         cout << "FAIL: Successful fetch attempt failed unexpectedly." << endl;
//     }

//     cout << "\n-----------------------------" << endl;

//     
//     cout << "Attempting FAILED fetch for: " << failure_url << endl;
//     string html_failure = http_get(failure_url);
    
//     if (html_failure.empty()) {
//         cout << "SUCCESS: Failed fetch attempt correctly returned empty string." << endl;
//     } else {
//         cout << "FAIL: Failed fetch attempt returned content unexpectedly." << endl;
//     }
    
//     // 4. Clean up libcurl globally once
//     curl_global_cleanup();

//     return 0;
// }