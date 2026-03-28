import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // localhost only — never exposed to network

// Serve static build
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback
app.get('*', (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(Number(PORT), HOST, () => {
  console.log(`Mipler running at http://localhost:${PORT}  (bound to ${HOST})`);
});
