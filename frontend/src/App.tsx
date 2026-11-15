import { useEffect, useState, type FormEvent } from 'react';
import CallOffice, { type CallConfig } from './CallOffice';
import './App.css';

const PLANS = ['Medi-Cal'] as const;

// Where provider data is scraped from. `id` must match SOURCES in server.js / script.py.
const SOURCES = [{ id: 'healthnet', label: 'Health Net California' }] as const;

type Provider = {
  name: string | null;
  organization: string | null;
  specialty: string | null;
  address: string | null;
  distance_miles: number | null;
  phone: string | null;
  accepting_new_patients: boolean | null;
  primary_care_provider: boolean | null;
  virtual_visits: boolean | null;
  notes: string[];
  last_verified: string | null;
};

type SearchResponse = {
  status: string;
  message: string;
  params: { zip: string; specialty: string; plan: string; source: string };
  providers: Provider[];
};

type FieldErrors = { zip?: string; specialty?: string };

function App() {
  const [zip, setZip] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [plan, setPlan] = useState<string>(PLANS[0]);
  const [source, setSource] = useState<string>(SOURCES[0].id);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [callConfig, setCallConfig] = useState<CallConfig | null>(null);

  useEffect(() => {
    fetch('/api/calls/config')
      .then((r) => (r.ok ? r.json() : null))
      .then(setCallConfig)
      .catch(() => setCallConfig(null));
  }, []);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!/^\d{5}$/.test(zip)) next.zip = 'Enter a 5-digit zip code.';
    if (!specialty.trim()) next.specialty = 'Enter a specialty.';
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    setRequestError('');
    setResult(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip, specialty: specialty.trim(), plan, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="intro">
        <h1>Find a provider near you</h1>
        <p>Tell us where you are, what kind of care you need, and your insurance plan.</p>
      </header>

      {callConfig?.enabled && (
        <p className={callConfig.test_mode ? 'mode-banner test' : 'mode-banner live'}>
          {!callConfig.test_mode
            ? 'Live mode: "Call office" phones the real provider office.'
            : callConfig.test_number
              ? `Test mode: every call goes to ${callConfig.test_number}, not the office.`
              : 'Test mode: RETELL_TEST_TO_NUMBER is invalid, so calls are blocked.'}
        </p>
      )}

      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="zip">Zip code</label>
          <input
            id="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="e.g. 95811"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            aria-invalid={!!errors.zip}
          />
          <p className="error">{errors.zip}</p>
        </div>

        <div className="field">
          <label htmlFor="specialty">Specialty</label>
          <input
            id="specialty"
            type="text"
            autoComplete="off"
            placeholder="e.g. Primary Care, Pediatrics, Dermatology"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            aria-invalid={!!errors.specialty}
          />
          <p className="error">{errors.specialty}</p>
        </div>

        <div className="field">
          <label htmlFor="plan">Insurance plan</label>
          <select id="plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="source">Search source</label>
          <select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="submit" disabled={loading}>
          {loading ? 'Searching… (this can take a minute)' : 'Search providers'}
        </button>
      </form>

      {requestError && <p className="card request-error">{requestError}</p>}

      {result && (
        <section className="results" aria-live="polite">
          <h2>{result.message}</h2>
          <p className="results-meta">
            {result.params.specialty} near {result.params.zip} · {result.params.plan} ·{' '}
            {SOURCES.find((s) => s.id === result.params.source)?.label ?? result.params.source}
          </p>
          <ul className="provider-list">
            {result.providers.map((p, i) => (
              <li key={`${p.name}-${p.address}-${i}`} className="card provider">
                <div className="provider-head">
                  <h3>{p.name ?? 'Unknown provider'}</h3>
                  {p.distance_miles != null && <span className="distance">{p.distance_miles} mi</span>}
                </div>
                {p.specialty && <p className="specialty">{p.specialty}</p>}
                {p.organization && p.organization.toLowerCase() !== p.name?.toLowerCase() && (
                  <p className="org">{p.organization}</p>
                )}
                {p.address && <p>{p.address}</p>}
                {p.phone && (
                  <p>
                    <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}>{p.phone}</a>
                  </p>
                )}
                <div className="tags">
                  {p.accepting_new_patients != null && (
                    <span className={p.accepting_new_patients ? 'tag yes' : 'tag no'}>
                      {p.accepting_new_patients ? 'Accepting new patients' : 'Not accepting new patients'}
                    </span>
                  )}
                  {p.primary_care_provider && <span className="tag">Primary care provider</span>}
                  {p.virtual_visits && <span className="tag">Virtual visits</span>}
                </div>
                {p.notes.map((note) => (
                  <p key={note} className="note">
                    {note}
                  </p>
                ))}
                <CallOffice
                  provider={p}
                  plan={result.params.plan}
                  specialty={result.params.specialty}
                  config={callConfig}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default App;
