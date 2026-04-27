const express = require('express');
const path = require('path');
const { getContainers } = require('./services/docker');
const { checkWebsites } = require('./services/http');

const app = express();

const PORT = process.env.PORT;
const URI = process.env.URI;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.static(path.join(__dirname, '../public')));

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

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`vps-monitor listening on port ${URI}:${PORT}`);
  });
}
