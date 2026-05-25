import { useRef, useEffect, useState } from 'react';

const GITHUB_REPO = 'deeeemiss/lvgl-web-simulator';
const GITHUB_URL  = 'https://github.com/' + GITHUB_REPO;

function useGitHubStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStars(d.stargazers_count))
      .catch(() => {});
  }, []);
  return stars;
}
import { RESOLUTIONS } from './DisplayCanvas';
import type { Resolution } from './DisplayCanvas';
import type { SimulatorStatus } from '../hooks/useSimulator';

interface ToolbarProps {
  status: SimulatorStatus;
  liveMode: boolean;
  resolution: Resolution;
  onRun: () => void;
  onStop: () => void;
  onResolutionChange: (r: Resolution) => void;
  onFileLoad: (content: string) => void;
}

const STATUS_LABELS: Record<SimulatorStatus, string> = {
  loading: 'Loading WASM…',
  ready: 'Ready',
  running: 'Running',
  error: 'Error',
};

const STATUS_COLORS: Record<SimulatorStatus, string> = {
  loading: '#f0a500',
  ready: '#4caf50',
  running: '#2196f3',
  error: '#f44336',
};

function GitHubButton({ stars }: { stars: number | null }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: '#21262d',
        border: '1px solid #30363d',
        borderRadius: 6,
        color: '#ccc',
        fontSize: 12,
        textDecoration: 'none',
        transition: 'background 0.12s ease, border-color 0.12s ease, color 0.12s ease',
        whiteSpace: 'nowrap',
        marginLeft: 'auto',
      }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#30363d'; el.style.borderColor = '#8b949e'; el.style.color = '#fff'; }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#21262d'; el.style.borderColor = '#30363d'; el.style.color = '#ccc'; }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.461-1.11-1.461-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
      GitHub
      {stars !== null && stars >= 1000 && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 3,
          background: '#30363d', borderRadius: 10, padding: '1px 6px', fontSize: 11,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#e3b341" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          {stars >= 1000 ? (stars / 1000).toFixed(1) + 'k' : stars}
        </span>
      )}
    </a>
  );
}

export function Toolbar({ status, liveMode, resolution, onRun, onStop, onResolutionChange, onFileLoad }: ToolbarProps) {
  const stars   = useGitHubStars();
  const canRun  = !liveMode && status === 'ready';
  const canStop = liveMode;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result;
      if (typeof text === 'string') onFileLoad(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const dotColor = liveMode ? '#f44336' : STATUS_COLORS[status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: '#1e1e1e',
      borderBottom: '1px solid #2a2a2a',
      minHeight: 44,
    }}>
      <span style={{ color: '#ccc', fontWeight: 600, fontSize: 14, marginRight: 4 }}>
        LVGL Simulator
      </span>

      <div style={{ width: 1, height: 20, background: '#333', margin: '0 4px', flexShrink: 0 }} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".py,text/plain"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button className="lvgl-btn lvgl-btn-open" onClick={() => fileInputRef.current?.click()} title="Open .py file">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Open
      </button>

      <button className="lvgl-btn lvgl-btn-run" onClick={onRun} disabled={!canRun}>
        ▶ Run
      </button>

      <button className="lvgl-btn lvgl-btn-stop" onClick={onStop} disabled={!canStop}>
        ■ Stop
      </button>

      <select
        className="lvgl-select"
        value={resolution.label}
        onChange={e => {
          const r = RESOLUTIONS.find(r => r.label === e.target.value);
          if (r) onResolutionChange(r);
        }}
      >
        {RESOLUTIONS.map(r => (
          <option key={r.label} value={r.label}>{r.label}</option>
        ))}
      </select>

      <GitHubButton stars={stars} />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: liveMode ? '0 0 6px #f44336' : 'none',
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          flexShrink: 0,
        }} />
        <span style={{ color: dotColor, fontSize: 12, transition: 'color 0.2s ease' }}>
          {liveMode ? 'Live' : STATUS_LABELS[status]}
        </span>
      </div>
    </div>
  );
}
