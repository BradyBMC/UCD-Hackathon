// Configuration for the Retell agent that phones provider offices.
// Edit the prompt or analysis fields here, then run `npm run retell:setup` to push the changes.

// {{...}} placeholders are filled per call from retell_llm_dynamic_variables (see retell/client.js).
const GENERAL_PROMPT = `
## Identity
You are Sam, an automated AI assistant calling a medical office on behalf of a patient who is
looking for a new {{specialty}} provider. You are calling {{provider_name}}, listed at
{{provider_address}}.

## Goals, in order
1. Confirm whether {{provider_name}} accepts {{insurance_plan}} insurance (through Health Net)
   for new patients.
2. Confirm whether they are currently accepting new patients.
3. If both are yes, ask for the next few available new-patient appointment dates and times.
   Try to get at least two or three specific options (day, date and time).

## Rules
- Say early in the call that you are an automated assistant calling for a patient.
- Do not book, hold or cancel any appointment. If they offer to book, say the patient will call
  back to book and you only need the available times.
- Do not give out any personal information. If they ask for the patient's name, date of birth or
  member ID, say the patient will provide it when they call back to book.
- If you reach a phone menu, listen to the options and use the press_digit tool to choose the
  option for appointments, scheduling, or the front desk. If you're asked to say an option, say it.
- If you are put on hold, wait quietly.
- Keep it short and polite; staff are busy. Don't repeat questions they've already answered.
- If they can't help, or you have all the answers, thank them and end the call with end_call.
- If you reach voicemail, hang up without leaving a message.
`.trim();

const BEGIN_MESSAGE =
  "Hi, this is Sam, an automated assistant calling on behalf of a patient. I have a couple of quick questions about new patient appointments. Is now a good time?";

const LLM_CONFIG = {
  start_speaker: 'user', // let the office pick up and greet first
  begin_message: BEGIN_MESSAGE,
  general_prompt: GENERAL_PROMPT,
  general_tools: [
    { type: 'end_call', name: 'end_call', description: 'End the call once the questions are answered, the office cannot help, or voicemail is reached.' },
    { type: 'press_digit', name: 'press_digit', description: 'Press a keypad digit to navigate a phone menu toward scheduling or the front desk.', delay_ms: 1500 },
  ],
  default_dynamic_variables: {
    provider_name: 'the provider',
    provider_address: 'an unknown address',
    specialty: 'primary care',
    insurance_plan: 'Medi-Cal',
  },
};

const YES_NO_UNKNOWN = ['yes', 'no', 'unknown'];

const AGENT_CONFIG = {
  agent_name: 'Provider office caller',
  voice_id: 'retell-Cimo',
  language: 'en-US',
  max_call_duration_ms: 10 * 60 * 1000,
  end_call_after_silence_ms: 60 * 1000,
  voicemail_option: { action: { type: 'hangup' } },
  post_call_analysis_data: [
    { type: 'system-presets', name: 'call_summary' },
    { type: 'system-presets', name: 'call_successful' },
    {
      type: 'enum',
      name: 'accepts_insurance',
      description: "Whether the office said they accept the patient's insurance plan for new patients.",
      choices: YES_NO_UNKNOWN,
    },
    {
      type: 'enum',
      name: 'accepting_new_patients',
      description: 'Whether the office said they are currently accepting new patients.',
      choices: YES_NO_UNKNOWN,
    },
    {
      type: 'string',
      name: 'appointment_times',
      description:
        'Every specific open new-patient appointment slot the office offered, separated by semicolons, each as day, date and time. Empty if none were offered.',
      examples: ['Tue Nov 18 9:30 AM; Wed Nov 19 2:00 PM'],
    },
    {
      type: 'string',
      name: 'other_requirements',
      description:
        'Anything else the patient needs to know before booking, such as referral required, paperwork, or a waitlist. Empty if none.',
      examples: ['Requires a referral from the primary care doctor'],
    },
  ],
};

module.exports = { LLM_CONFIG, AGENT_CONFIG };
