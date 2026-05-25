import { useRef } from 'react';
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

export function Toolbar({ status, liveMode, resolution, onRun, onStop, onResolutionChange, onFileLoad }: ToolbarProps) {
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
