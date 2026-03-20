import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use raw body parser for the proxy to handle all types of data
  app.use("/api-proxy", express.raw({ type: "*/*", limit: "10mb" }));

  // API routes
  app.get("/api/config", (req, res) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    res.json({ GEMINI_API_KEY: key });
  });

  // API Proxy Route - More robust wildcard for Express 5
  app.all("/api-proxy/*", async (req, res) => {
    // In Express 5, req.params[0] or similar might be used, but let's use req.path
    const targetPath = req.path.replace("/api-proxy/", "");
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!geminiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables");
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    // Construct the target URL
    const targetUrl = new URL(`https://generativelanguage.googleapis.com/${targetPath}`);
    
    // Copy query parameters from original request
    Object.entries(req.query).forEach(([key, value]) => {
      targetUrl.searchParams.append(key, String(value));
    });

    // Append the API key as requested
    targetUrl.searchParams.set("key", geminiKey);

    console.log(`Proxying ${req.method} request to: ${targetUrl.origin}${targetUrl.pathname}`);

    try {
      const headers: Record<string, string> = {};
      // Copy relevant headers
      const forbiddenHeaders = ['host', 'connection', 'content-length'];
      Object.entries(req.headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (!forbiddenHeaders.includes(lowerKey) && value) {
          // Skip existing api key headers as we will inject the server's key
          if (lowerKey !== 'x-goog-api-key') {
            headers[key] = String(value);
          }
        }
      });

      // Inject the server's API key into the headers
      headers['x-goog-api-key'] = geminiKey;

      // Set a 300s timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 seconds

      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.arrayBuffer();
      
      // Forward headers from the Gemini API response
      response.headers.forEach((value, key) => {
        // Skip some headers that might cause issues
        if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      res.status(response.status).send(Buffer.from(data));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to proxy request" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
