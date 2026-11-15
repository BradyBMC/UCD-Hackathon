const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Load Retell keys etc. from .env (see .env.example) before anything reads process.env.
const ENV_PATH = path.join(__dirname, '.env');
if (fs.existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);

const { callProvider, getCallResult, testModeStatus } = require('./retell/client');

const app = express();
const PORT = process.env.PORT || 5001;
const PYTHON = process.env.PYTHON || 'python3';
const SCRIPT = path.join(__dirname, 'script.py');
const PLANS = ['Medi-Cal'];
const SOURCES = ['healthnet'];

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Runs script.py with the given args and resolves with its parsed JSON output.
function runPython(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [SCRIPT, ...args]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python exited with code ${code}: ${stderr.trim()}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Could not parse Python output: ${stdout.trim()}`));
      }
    });
  });
}

// POST /api/search  { zip, specialty, plan, source }
app.post('/api/search', async (req, res) => {
  const { zip, specialty, plan, source } = req.body ?? {};

  if (typeof zip !== 'string' || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'zip must be a 5-digit zip code.' });
  }
  if (typeof specialty !== 'string' || !specialty.trim()) {
    return res.status(400).json({ error: 'specialty is required.' });
  }
  if (!PLANS.includes(plan)) {
    return res.status(400).json({ error: `plan must be one of: ${PLANS.join(', ')}.` });
  }
  if (!SOURCES.includes(source)) {
    return res.status(400).json({ error: `source must be one of: ${SOURCES.join(', ')}.` });
  }

  try {
    const result = await runPython([zip, specialty.trim(), plan, source]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calls/config  -> whether calling is set up, and whether it's in test mode
app.get('/api/calls/config', (req, res) => {
  const { RETELL_API_KEY, RETELL_AGENT_ID, RETELL_FROM_NUMBER } = process.env;
  const test = testModeStatus();
  res.json({
    enabled: !!(RETELL_API_KEY && RETELL_AGENT_ID && RETELL_FROM_NUMBER),
    test_mode: test.enabled,
    test_number: test.number, // null when test mode is on but the number is invalid
  });
});

// POST /api/calls  { provider: { name, phone, address, specialty }, plan, specialty }
// Has the Retell agent phone the provider's office about insurance and open appointments.
app.post('/api/calls', async (req, res) => {
  const { provider, plan, specialty } = req.body ?? {};
  if (!provider || typeof provider.phone !== 'string' || typeof provider.name !== 'string') {
    return res.status(400).json({ error: 'provider with name and phone is required.' });
  }
  if (!PLANS.includes(plan)) {
    return res.status(400).json({ error: `plan must be one of: ${PLANS.join(', ')}.` });
  }

  try {
    res.json(await callProvider({ provider, plan, specialty }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calls/:id  -> call status, and once ended, the answers pulled from the conversation
app.get('/api/calls/:id', async (req, res) => {
  try {
    res.json(await getCallResult(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  const test = testModeStatus();
  if (!test.enabled) console.log('Retell calls: LIVE, calls go to real provider offices');
  else if (test.number) console.log(`Retell calls: TEST MODE, all calls go to ${test.number}`);
  else console.log('Retell calls: TEST MODE, but RETELL_TEST_TO_NUMBER is invalid, so calls are blocked');
});
