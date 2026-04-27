import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getContainers } from './services/docker.js';
import { checkWebsites } from './services/http.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const app = express();

app.use(express.static(join(__dirname, '../public')));

app.get('/api/status', async (req, res) => {
  try {
    const [containers, websites] = await Promise.all([
      getContainers(),
      checkWebsites(BASE_URL),
    ]);

    const allRunning = containers.every((c) => c.status === 'running');
    const allUp = websites.every((w) => w.status === 'OK');

    res.json({
      containers,
      websites,
      globalStatus: allRunning && allUp ? 'OK' : 'KO',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`vps-monitor listening on ${BASE_URL}`);
  });
}
