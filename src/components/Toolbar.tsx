import { useRef } from 'react';

const GITHUB_URL = 'https://github.com/deeeemiss/lvgl-web-simulator';
import { RESOLUTIONS } from './DisplayCanvas';
import { useTheme } from '../ThemeContext';
import { ShortcutsModal } from './ShortcutsModal';
import type { Resolution } from './DisplayCanvas';
import type { SimulatorStatus } from '../hooks/useSimulator';

interface ToolbarProps {
  status: SimulatorStatus;
  liveMode: boolean;
  language: string;
  resolution: Resolution;
  canRun: boolean;
  onRun: () => void;
  onStop: () => void;
  onResolutionChange: (r: Resolution) => void;
  onFileLoad: (content: string, language: string) => void;
}

const STATUS_LABELS: Record<SimulatorStatus, string> = {
  loading:    'Loading WASM…',
  ready:      'Ready',
  running:    'Running',
  error:      'Error',
  compiling:  'Compiling…',
};

const STATUS_COLORS: Record<SimulatorStatus, string> = {
  loading:   '#f0a500',
  ready:     '#4caf50',
  running:   '#2196f3',
  error:     '#f44336',
  compiling: '#a06be0',
};

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

function GitHubButton() {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="View on GitHub"
      className="lvgl-icon-btn"
      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.461-1.11-1.461-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    </a>
  );
}

export function Toolbar({ status, liveMode, language, resolution, canRun, onRun, onStop, onResolutionChange, onFileLoad }: ToolbarProps) {
  const { theme, toggle } = useTheme();
  const canStop = liveMode || status === 'compiling' || status === 'running';
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const lang = ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'hpp' || ext === 'h' ? 'cpp'
               : ext === 'c' ? 'c'
               : 'python';
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result;
      if (typeof text === 'string') onFileLoad(text, lang);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const isCLang = language === 'c' || language === 'cpp';
  const dotColor = status === 'compiling' ? STATUS_COLORS.compiling
                 : liveMode              ? '#f44336'
                 :                         STATUS_COLORS[status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      background: theme.bgToolbar,
      borderBottom: `1px solid ${theme.border}`,
      minHeight: 44,
    }}>
      <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: 14, marginRight: 4 }}>
        LVGL Simulator
      </span>

      <div style={{ width: 1, height: 20, background: theme.borderSubtle, margin: '0 4px', flexShrink: 0 }} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".py,.c,.cpp,.cc,.cxx,.h,.hpp,text/plain"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button className="lvgl-btn lvgl-btn-open" onClick={() => fileInputRef.current?.click()} title="Open .py / .c / .cpp file">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Open
      </button>

      <button
        className="lvgl-btn lvgl-btn-run"
        onClick={onRun}
        disabled={!canRun}
        title={isCLang ? 'Compile & run C/C++ (server-side emscripten)' : 'Run Python (Ctrl+Enter)'}
      >
        {status === 'compiling' ? '⏳ Compiling…' : '▶ Run'}
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

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: (liveMode || status === 'compiling' || status === 'running') ? `0 0 6px ${dotColor}` : 'none',
            transition: 'background 0.2s ease, box-shadow 0.2s ease',
            flexShrink: 0,
          }} />
          <span style={{ color: dotColor, fontSize: 12, transition: 'color 0.2s ease' }}>
            {status === 'compiling' ? 'Compiling…' : liveMode ? 'Live' : STATUS_LABELS[status]}
          </span>
        </div>
        <button className="lvgl-icon-btn" onClick={toggle} title={theme.name === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme.name === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <ShortcutsModal />
        <GitHubButton />
      </div>
    </div>
  );
}
