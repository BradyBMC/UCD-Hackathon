// Creates (or updates) the Retell LLM + agent from retell/agentConfig.js and saves their IDs to .env.
// Usage: npm run retell:setup
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);

const { retell } = require('./client');
const { LLM_CONFIG, AGENT_CONFIG } = require('./agentConfig');

// Sets KEY=value in .env, keeping every other line as-is.
function saveEnv(updates) {
  const lines = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8').split('\n') : [];
  for (const [key, value] of Object.entries(updates)) {
    const i = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (i >= 0) lines[i] = `${key}=${value}`;
    else lines.splice(lines.at(-1) === '' ? lines.length - 1 : lines.length, 0, `${key}=${value}`);
  }
  fs.writeFileSync(ENV_PATH, lines.join('\n').replace(/\n*$/, '\n'));
}

async function main() {
  let { RETELL_LLM_ID: llmId, RETELL_AGENT_ID: agentId, RETELL_FROM_NUMBER: fromNumber } = process.env;

  if (llmId) {
    await retell('PATCH', `/update-retell-llm/${llmId}`, LLM_CONFIG);
    console.log(`Updated LLM ${llmId}`);
  } else {
    llmId = (await retell('POST', '/create-retell-llm', LLM_CONFIG)).llm_id;
    console.log(`Created LLM ${llmId}`);
  }

  const agentBody = { ...AGENT_CONFIG, response_engine: { type: 'retell-llm', llm_id: llmId } };
  if (agentId) {
    await retell('PATCH', `/update-agent/${agentId}`, agentBody);
    console.log(`Updated agent ${agentId}`);
  } else {
    agentId = (await retell('POST', '/create-agent', agentBody)).agent_id;
    console.log(`Created agent ${agentId}`);
  }

  const updates = { RETELL_LLM_ID: llmId, RETELL_AGENT_ID: agentId };

  if (!fromNumber) {
    const { items = [] } = await retell('GET', '/v2/list-phone-numbers');
    if (items.length === 0) {
      console.log(
        '\nNo Retell phone number yet. Buy one in the Retell dashboard (Phone Numbers > Buy),\n' +
          'then run this again or set RETELL_FROM_NUMBER=+1XXXXXXXXXX in .env.',
      );
    } else {
      fromNumber = items[0].phone_number;
      updates.RETELL_FROM_NUMBER = fromNumber;
      console.log(`Using phone number ${fromNumber}` + (items.length > 1 ? ' (change RETELL_FROM_NUMBER in .env to use another)' : ''));
    }
  }

  saveEnv(updates);
  console.log('\nSaved to .env.');
  if (!process.env.RETELL_TEST_TO_NUMBER) {
    console.log('Tip: set RETELL_TEST_TO_NUMBER=+1<your cell> in .env so test calls ring you instead of real offices.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
