const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5001;
const PYTHON = process.env.PYTHON || 'python3';
const SCRIPT = path.join(__dirname, 'script.py');
const PLANS = ['Medi-Cal'];

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

// POST /api/search  { zip, specialty, plan }
app.post('/api/search', async (req, res) => {
  const { zip, specialty, plan } = req.body ?? {};

  if (typeof zip !== 'string' || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'zip must be a 5-digit zip code.' });
  }
  if (typeof specialty !== 'string' || !specialty.trim()) {
    return res.status(400).json({ error: 'specialty is required.' });
  }
  if (!PLANS.includes(plan)) {
    return res.status(400).json({ error: `plan must be one of: ${PLANS.join(', ')}.` });
  }

  try {
    const result = await runPython([zip, specialty.trim(), plan]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
