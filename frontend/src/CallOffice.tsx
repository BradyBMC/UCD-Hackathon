import { useEffect, useRef, useState } from 'react';

export type CallConfig = { enabled: boolean; test_mode: boolean; test_number: string | null };

type CallStart = { call_id: string; to_number: string; office_number: string; test_mode: boolean };

type CallResult = {
  call_id: string;
  status: 'registered' | 'not_connected' | 'ongoing' | 'ended' | 'error';
  done: boolean;
  analysis_ready: boolean;
  disconnection_reason: string | null;
  duration_ms: number | null;
  summary: string | null;
  successful: boolean | null;
  in_voicemail: boolean | null;
  accepts_insurance: 'yes' | 'no' | 'unknown' | null;
  accepting_new_patients: 'yes' | 'no' | 'unknown' | null;
  appointment_times: string[];
  other_requirements: string | null;
  transcript: string | null;
};

type Props = {
  provider: { name: string | null; phone: string | null; address: string | null; specialty: string | null };
  plan: string;
  specialty: string;
  config: CallConfig | null;
};

const POLL_MS = 4000;
// Analysis shows up a few seconds after the call ends; stop waiting for it after this long.
const ANALYSIS_WAIT_MS = 60_000;

const STATUS_TEXT: Record<CallResult['status'], string> = {
  registered: 'Dialing…',
  ongoing: 'On the call…',
  ended: 'Call ended',
  not_connected: "Couldn't connect",
  error: 'Call failed',
};

function Answer({ label, value }: { label: string; value: string | null }) {
  const cls = value === 'yes' ? 'tag yes' : value === 'no' ? 'tag no' : 'tag';
  return (
    <span className={cls}>
      {label}: {value ?? 'unknown'}
    </span>
  );
}

export default function CallOffice({ provider, plan, specialty, config }: Props) {
  const [start, setStart] = useState<CallStart | null>(null);
  const [result, setResult] = useState<CallResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endedAt = useRef<number | null>(null);

  // Poll the call until it ends and its analysis is in (or we give up waiting for analysis).
  useEffect(() => {
    if (!start) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/calls/${encodeURIComponent(start.call_id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        if (cancelled) return;
        setResult(data);
        if (data.done && endedAt.current === null) endedAt.current = Date.now();
        const waitedTooLong = endedAt.current !== null && Date.now() - endedAt.current > ANALYSIS_WAIT_MS;
        // Done when: analysis is in, the call never connected/errored (no analysis coming), or we gave up.
        const failed = data.done && data.status !== 'ended';
        if (data.analysis_ready || failed || waitedTooLong) {
          setBusy(false);
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not check the call.');
        setBusy(false);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [start]);

  if (!provider.phone) return null;

  if (config && !config.enabled) {
    return <p className="call-hint">Set up Retell (see README) to have an assistant call this office.</p>;
  }

  const startCall = async () => {
    const target = config?.test_mode ? 'your test number (test mode)' : provider.phone;
    if (!window.confirm(`An AI assistant will call ${target} to ask about ${plan} and open appointments. Continue?`)) return;

    setBusy(true);
    setError('');
    setResult(null);
    endedAt.current = null;
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, plan, specialty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setStart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the call.');
      setBusy(false);
    }
  };

  const waitingForAnalysis = result?.status === 'ended' && !result.analysis_ready && busy;

  return (
    <div className="call">
      <button type="button" className="call-button" onClick={startCall} disabled={busy}>
        {busy ? 'Calling…' : result ? 'Call again' : 'Call office about insurance & appointments'}
      </button>

      {start?.test_mode && <p className="call-hint">Test mode: calling {start.to_number} instead of the office.</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="call-result" aria-live="polite">
          <p className="call-status">
            {waitingForAnalysis ? 'Call ended, summarizing…' : STATUS_TEXT[result.status]}
            {result.in_voicemail && ' (reached voicemail)'}
          </p>

          {result.analysis_ready && (
            <>
              <div className="tags">
                <Answer label={`Takes ${plan}`} value={result.accepts_insurance} />
                <Answer label="New patients" value={result.accepting_new_patients} />
              </div>

              {result.appointment_times.length > 0 ? (
                <>
                  <p className="call-label">Open appointments</p>
                  <ul className="slots">
                    {result.appointment_times.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>No appointment times were offered.</p>
              )}

              {result.other_requirements && <p className="note">{result.other_requirements}</p>}
              {result.summary && <p className="summary">{result.summary}</p>}
            </>
          )}

          {result.transcript && (
            <details>
              <summary>Transcript</summary>
              <pre className="transcript">{result.transcript}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
