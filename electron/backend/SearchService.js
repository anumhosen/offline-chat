const https = require("https");
const http = require("http");

class SearchService {
  /**
   * Search using DuckDuckGo HTML (scrapes the actual search results)
   */
  static async searchDuckDuckGoHTML(query, maxResults = 5) {
    //console.log("Searching DuckDuckGo HTML:", query);

    return new Promise((resolve, reject) => {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const results = [];

              // Parse HTML results manually
              // Each result is in a div with class "result"
              const resultRegex =
                /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
              const snippetRegex = /<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;

              const links = [];
              const snippets = [];

              let match;
              while ((match = resultRegex.exec(data)) !== null) {
                links.push({
                  url: match[1],
                  title: match[2].replace(/<\/?[^>]+(>|$)/g, "").trim(),
                });
              }

              while ((match = snippetRegex.exec(data)) !== null) {
                snippets.push(match[1].replace(/<\/?[^>]+(>|$)/g, "").trim());
              }

              // Combine links and snippets
              for (let i = 0; i < Math.min(links.length, snippets.length, maxResults); i++) {
                results.push({
                  title: links[i].title,
                  snippet: snippets[i],
                  url: links[i].url,
                  source: "DuckDuckGo",
                });
              }

              //console.log(`Found ${results.length} results`);
              resolve(results);
            } catch (e) {
              reject(e);
            }
          });
        })
        .on("error", reject);
    });
  }

  /**
   * Search using SerpAPI-style scraping (multiple sources)
   */
  static async searchWeb(query, maxResults = 5) {
    //console.log("Web search:", query);

    try {
      // Try DuckDuckGo HTML search
      const results = await this.searchDuckDuckGoHTML(query, maxResults);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn("DuckDuckGo HTML search failed:", e.message);
    }

    // Fallback: Search using Wikipedia API
    try {
      const wikiResults = await this.searchWikipedia(query, 3);
      if (wikiResults.length > 0) return wikiResults;
    } catch (e) {
      console.warn("Wikipedia search failed:", e.message);
    }

    // Final fallback: Create a helpful message for the LLM
    return [
      {
        title: "Web Search Unavailable",
        snippet: `No external results found for "${query}". The AI will answer based on its training data. For live information, search manually: https://www.google.com/search?q=${encodeURIComponent(query)}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        source: "Fallback",
      },
    ];
  }

  /**
   * Search Wikipedia API
   */
  static async searchWikipedia(query, maxResults = 3) {
    //console.log("Searching Wikipedia:", query);

    return new Promise((resolve) => {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&srlimit=${maxResults}`;

      https
        .get(url, { headers: { "User-Agent": "OfflineChat/1.0" } }, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              const results = (json.query?.search || []).map((item) => ({
                title: item.title,
                snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, "").trim(),
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
                source: "Wikipedia",
              }));
              //console.log(`Wikipedia: ${results.length} results`);
              resolve(results);
            } catch (e) {
              console.warn("Wikipedia parse error:", e.message);
              resolve([]);
            }
          });
        })
        .on("error", () => resolve([]));
    });
  }

  /**
   * Search using Google (with better headers and delay)
   */
  static async searchGoogle(query, maxResults = 5) {
    //console.log("Searching Google:", query);

    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));

    return new Promise((resolve, reject) => {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.google.com/search?q=${encodedQuery}&num=${maxResults}&hl=en`;

      // Rotate user agents to avoid detection
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ];

      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

      https
        .get(
          url,
          {
            headers: {
              "User-Agent": userAgent,
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept-Encoding": "gzip, deflate, br",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
              "Sec-Ch-Ua-Mobile": "?0",
              "Sec-Ch-Ua-Platform": '"Windows"',
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "none",
              "Sec-Fetch-User": "?1",
              "Upgrade-Insecure-Requests": "1",
            },
          },
          (res) => {
            let data = "";

            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400) {
              const redirectUrl = res.headers.location;
              if (redirectUrl) {
                https
                  .get(redirectUrl, (redirectRes) => {
                    let redirectData = "";
                    redirectRes.on("data", (chunk) => {
                      redirectData += chunk;
                    });
                    redirectRes.on("end", () => {
                      resolve(this.parseGoogleResults(redirectData, maxResults));
                    });
                  })
                  .on("error", reject);
                return;
              }
            }

            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              resolve(this.parseGoogleResults(data, maxResults));
            });
          },
        )
        .on("error", (err) => {
          console.warn("Google request failed:", err.message);
          resolve([]); // Return empty instead of rejecting
        });
    });
  }

  /**
   * Parse Google search results HTML
   */
  static parseGoogleResults(html, maxResults) {
    try {
      const results = [];

      // Multiple regex patterns for different Google result formats
      const patterns = [
        // Modern Google format
        /<div class="g"[^>]*>[\s\S]*?<h3[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/h3>[\s\S]*?<a[^>]*href="\/url\?q=([^"&]+)[^"]*"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g,
        // Alternative format
        /<a[^>]*href="\/url\?q=([^"&]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null && results.length < maxResults) {
          let title, url, snippet;

          if (pattern.toString().includes('class="g"')) {
            title = match[1]?.replace(/<\/?[^>]+(>|$)/g, "").trim();
            url = decodeURIComponent(match[2] || "");
            snippet = match[3]?.replace(/<\/?[^>]+(>|$)/g, "").trim();
          } else {
            url = decodeURIComponent(match[1] || "");
            title = match[2]?.replace(/<\/?[^>]+(>|$)/g, "").trim();
            snippet = match[3]?.replace(/<\/?[^>]+(>|$)/g, "").trim();
          }

          if (title && url && !url.includes("google.com")) {
            results.push({
              title,
              snippet: snippet?.slice(0, 200) || "",
              url,
              source: "Google",
            });
          }
        }

        if (results.length > 0) break;
      }

      //console.log(`Google parsed: ${results.length} results`);

      // Debug: Save HTML to file if no results
      if (results.length === 0) {
        const fs = require("fs");
        fs.writeFileSync("/tmp/google_debug.html", html.slice(0, 5000));
        //console.log("No results found. Saved HTML sample to /tmp/google_debug.html");
      }

      return results;
    } catch (e) {
      console.warn("Parse error:", e.message);
      return [];
    }
  }

  /**
   * Format search results for context injection
   */
  static formatResults(results, query) {
    if (!results || results.length === 0) {
      return `No web results found for: "${query}". The LLM will answer based on its training data.`;
    }

    let context = `\n\n[Web Search Results for: "${query}"]\n`;
    results.forEach((r, i) => {
      context += `\n${i + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}\n`;
    });
    context += `\n[Use this information to provide an accurate, up-to-date answer. Cite sources by number when possible.]\n`;

    return context;
  }

  /**
   * Smart search - tries multiple sources
   */
  static async smartSearch(query, maxResults = 5) {
    //console.log("Smart search:", query);

    // Try Google first (best results)
    try {
      const googleResults = await this.searchGoogle(query, maxResults);
      if (googleResults.length > 0) return googleResults;
    } catch (e) {
      console.warn("Google search failed:", e.message);
    }

    // Fallback to DuckDuckGo HTML
    try {
      const ddgResults = await this.searchDuckDuckGoHTML(query, maxResults);
      if (ddgResults.length > 0) return ddgResults;
    } catch (e) {
      console.warn("DDG search failed:", e.message);
    }

    // Fallback to Wikipedia
    try {
      const wikiResults = await this.searchWikipedia(query, maxResults);
      if (wikiResults.length > 0) return wikiResults;
    } catch (e) {
      console.warn("Wikipedia search failed:", e.message);
    }

    return [];
  }
}

module.exports = SearchService;
