// Minimal Retell REST client (https://docs.retellai.com). Reads RETELL_API_KEY from the environment.
const BASE_URL = 'https://api.retellai.com';

async function retell(method, path, body) {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY is not set (add it to .env).');

  const res = await fetch(BASE_URL + path, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = data.message || data.error || text;
    throw new Error(`Retell ${method} ${path} failed (${res.status}): ${detail}`);
  }
  return data;
}

// "1-916-555-0100", "(916) 555-0100" -> "+19165550100"
function toE164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

// Starts an outbound call to a provider's office. `provider` is one result from /api/search.
async function callProvider({ provider, plan, specialty }) {
  const { RETELL_AGENT_ID, RETELL_FROM_NUMBER, RETELL_TEST_TO_NUMBER } = process.env;
  if (!RETELL_AGENT_ID || !RETELL_FROM_NUMBER) {
    throw new Error('RETELL_AGENT_ID and RETELL_FROM_NUMBER must be set. Run `npm run retell:setup`.');
  }

  const officeNumber = toE164(provider.phone);
  if (!officeNumber) throw new Error(`Can't call "${provider.phone}": not a US phone number.`);

  // In test mode every call goes to your own phone so you can play the office.
  // A mistyped test number must never fall through to the real office.
  const { enabled: testMode, number: testNumber } = testModeStatus();
  if (testMode && !testNumber) {
    throw new Error(`RETELL_TEST_TO_NUMBER "${RETELL_TEST_TO_NUMBER}" isn't a valid US number. Not calling.`);
  }
  const toNumber = testMode ? testNumber : officeNumber;

  const call = await retell('POST', '/v2/create-phone-call', {
    from_number: toE164(RETELL_FROM_NUMBER),
    to_number: toNumber,
    override_agent_id: RETELL_AGENT_ID,
    retell_llm_dynamic_variables: {
      provider_name: provider.name || 'the provider',
      provider_address: provider.address || 'an unknown address',
      specialty: provider.specialty || specialty || 'primary care',
      insurance_plan: plan || 'Medi-Cal',
    },
    metadata: { provider_name: provider.name, office_number: officeNumber },
  });

  return { call_id: call.call_id, to_number: toNumber, office_number: officeNumber, test_mode: testMode };
}

// Test mode is on whenever RETELL_TEST_TO_NUMBER is non-empty; `number` is null if it's invalid.
function testModeStatus() {
  const raw = (process.env.RETELL_TEST_TO_NUMBER || '').trim();
  return { enabled: raw !== '', number: raw ? toE164(raw) : null };
}

// Returns a trimmed view of a call for the frontend.
async function getCallResult(callId) {
  const call = await retell('GET', `/v2/get-call/${encodeURIComponent(callId)}`);
  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis_data || {};
  const done = call.call_status === 'ended' || call.call_status === 'error' || call.call_status === 'not_connected';

  return {
    call_id: call.call_id,
    status: call.call_status,
    done,
    // Analysis is filled in a few seconds after the call ends; keep polling until it arrives.
    analysis_ready: done && !!call.call_analysis,
    disconnection_reason: call.disconnection_reason || null,
    duration_ms: call.duration_ms || null,
    summary: analysis.call_summary || null,
    successful: analysis.call_successful ?? null,
    in_voicemail: analysis.in_voicemail ?? null,
    accepts_insurance: custom.accepts_insurance || null,
    accepting_new_patients: custom.accepting_new_patients || null,
    appointment_times: (custom.appointment_times || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
    other_requirements: custom.other_requirements || null,
    transcript: call.transcript || null,
  };
}

module.exports = { retell, toE164, callProvider, getCallResult, testModeStatus };
