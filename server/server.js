const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');

const { createEngine } = require('../api/_engine');
const { createNodeStatsStore } = require('./stats-store');

function createServer(port = 8000) {
  const app = express();
  const server = http.createServer(app);
  const engine = createEngine({ statsStore: createNodeStatsStore() });

  app.use(cors());
  app.use(express.json());

  app.get('/api/status', async (req, res) => {
    res.json(await engine.opStatus());
  });

  app.get('/api/generate', async (req, res) => {
    try {
      const out = await engine.opGenerate();
      res.status(out.status === 'error' ? 502 : 200).json(out);
    } catch (err) {
      res.status(500).json({ status: 'error', data: null, message: err.message });
    }
  });

  app.get('/api/inbox', async (req, res) => {
    try {
      res.json(await engine.opInbox({ email: req.query.email }));
    } catch (err) {
      res.status(500).json({ status: 'error', data: null, message: err.message });
    }
  });

  app.get('/api/message', async (req, res) => {
    try {
      res.json(await engine.opMessage({ email: req.query.email, link: req.query.link }));
    } catch (err) {
      res.status(500).json({ status: 'error', data: null, message: err.message });
    }
  });

  app.get('/api/track', async (req, res) => {
    const fwd = req.headers['x-forwarded-for'] || '';
    const ip = String(fwd).split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '';
    try {
      res.json(await engine.opTrack({
        page: req.query.page,
        ref: req.query.ref,
        ua: req.headers['user-agent'] || '',
        ip
      }));
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const out = await engine.opStats(req.query.key);
      res.status(out.status === 'error' && out.error_code === 'UNAUTHORIZED' ? 401 : 200).json(out);
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // JSON 404 for any unmatched /api path
  app.use('/api', (req, res) => {
    res.status(404).json({ status: 'error', data: null, message: 'Not found' });
  });

  // Static frontend - served from public/ only, so server sources can never leak.
  const WEB_ROOT = path.join(__dirname, '..', 'public');
  app.use(express.static(WEB_ROOT, { index: 'index.html', extensions: ['html'] }));

  return { app, server };
}

if (require.main === module) {
  const port = parseInt(process.env.PORT, 10) || 8000;
  const { server } = createServer(port);
  server.listen(port, () => {
    console.log(`NoisyMail relay running at http://127.0.0.1:${port} (status: /api/status)`);
  });
}

module.exports = { createServer };
