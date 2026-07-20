const express = require('express');
const cors = require('cors');
const referralsRouter = require('./routes/referrals');
const academiesRouter = require('./routes/academies');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    }),
  );
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Off-chain data endpoints. `referrals` is the first migrated workload;
  // future off-chain features (chat history, comments — see the root
  // README architecture diagram) should follow the same pattern: a
  // dedicated service module + a router mounted here.
  app.use('/referrals', referralsRouter);
  app.use('/academies', academiesRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
