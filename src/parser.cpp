// ===============================================
// Parser
// -----------------------------------------------
// Extracts hyperlinks from HTML source code and
// returns a list of cleaned, normalized URLs.
//
// Required Functions:
//   + vector<string> extractLinks(const string& html)
//   + string resolveUrl(const string& base, const string& link)
//   + bool isValidLink(const string& url)
//
// Notes:
//   - Remove 'javascript:' and 'mailto:' links.
//   - Convert relative URLs → absolute URLs.
//   - Filtering duplicates is optional.
//
// TODO: Improve regex for <a href=""> extraction.
