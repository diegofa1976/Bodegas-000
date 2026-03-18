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
    res.json({ GEMINI_API_KEY: process.env.GEMINI_API_KEY });
  });

  // API Proxy Route
  app.all("/api-proxy/*path", async (req, res) => {
    const targetPath = req.params.path;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables");
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    // Construct the target URL
    // The service worker sends the path after /api-proxy/
    // e.g. /api-proxy/v1beta/models/gemini-pro:generateContent
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
        if (!forbiddenHeaders.includes(key.toLowerCase()) && value) {
          headers[key] = String(value);
        }
      });

      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
      });

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
