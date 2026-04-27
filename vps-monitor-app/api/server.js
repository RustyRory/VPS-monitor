const express = require('express');
const path = require('path');
const { getContainers } = require('./services/docker');

const app = express();

const PORT = process.env.PORT;
const URI = process.env.URI;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/status', async (req, res) => {
  try {
    const containers = await getContainers();
    const allRunning = containers.every((c) => c.status === 'running');

    res.json({
      containers,
      websites: [],
      globalStatus: allRunning ? 'OK' : 'KO',
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
