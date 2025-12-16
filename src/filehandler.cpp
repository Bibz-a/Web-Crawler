// ===============================================
// FileHandler
// -----------------------------------------------
// Responsible for:
//   - Fetching webpage HTML via HTTP request
//   - Saving files (HTML, logs) into /data/ directory
//
// Required Functions:
//   + string fetchURL(const string& url)
//   + void saveFile(const string& path, const string& content)
//
// Notes:
//   - Use cURL (libcurl) for downloading HTML.
//   - Handle connection errors gracefully.
//   - Ensure /data/ folder exists before writing.
//
// TODO: Add retry logic for network issues.
// ===============================================
