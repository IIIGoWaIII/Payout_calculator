const http = require("http");
const { readFile, stat } = require("fs/promises");
const { extname, join, normalize } = require("path");

const port = process.env.PORT || 4173;
const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

http
  .createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let filePath = normalize(join(root, urlPath === "/" ? "index.html" : urlPath));
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        return res.end();
      }
      let st = await stat(filePath);
      if (st.isDirectory()) filePath = join(filePath, "index.html");
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Nie znaleziono");
    }
  })
  .listen(port, "0.0.0.0", () => console.log("http://0.0.0.0:" + port));