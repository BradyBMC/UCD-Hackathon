import { useState, type FormEvent } from 'react';
import './App.css';

const PLANS = ['Medi-Cal'] as const;

type SearchResponse = {
  status: string;
  message: string;
  params: { zip: string; specialty: string; plan: string };
};

type FieldErrors = { zip?: string; specialty?: string };

function App() {
  const [zip, setZip] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [plan, setPlan] = useState<string>(PLANS[0]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);

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
        body: JSON.stringify({ zip, specialty: specialty.trim(), plan }),
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

        <button type="submit" className="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search providers'}
        </button>
      </form>

      {requestError && <p className="card request-error">{requestError}</p>}

      {result && (
        <section className="card results" aria-live="polite">
          <h2>{result.message}</h2>
          <dl>
            <dt>Zip code</dt>
            <dd>{result.params.zip}</dd>
            <dt>Specialty</dt>
            <dd>{result.params.specialty}</dd>
            <dt>Insurance plan</dt>
            <dd>{result.params.plan}</dd>
          </dl>
        </section>
      )}
    </main>
  );
}

export default App;
