import { useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import type { SimulatorOutput } from '../hooks/useSimulator';

interface StatusBarProps {
  output: SimulatorOutput[];
  onClear: () => void;
  embedded?: boolean; // fill parent height, no drag handle, no fixed height
}

const TYPE_COLORS: Record<SimulatorOutput['type'], string> = {
  stdout: '#ccc',
  stderr: '#f0a500',
  error: '#f44336',
};

const LS_KEY = 'lvgl-statusbar-height';
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 140;

function loadHeight(): number {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (n >= MIN_HEIGHT && n <= MAX_HEIGHT) return n;
    }
  } catch {}
  return DEFAULT_HEIGHT;
}

export function StatusBar({ output, onClear, embedded }: StatusBarProps) {
  const { theme } = useTheme();
  const heightRef = useRef(loadHeight());
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = heightRef.current;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const delta = startY.current - e.clientY;
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH.current + delta));
      heightRef.current = next;
      containerRef.current.style.height = next + 'px';
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        try { localStorage.setItem(LS_KEY, String(heightRef.current)); } catch {}
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (embedded) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d0d0d' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '2px 12px',
        borderBottom: `1px solid ${theme.border}`,
        minHeight: 26,
        flexShrink: 0,
      }}>
        <span style={{ color: theme.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Output
        </span>
        <button className="lvgl-clear-btn" onClick={onClear}>Clear</button>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 12px',
        fontFamily: 'monospace',
        fontSize: 12,
      }}>
        {output.length === 0 ? (
          <span style={{ color: theme.textMuted }}>No output yet. Click Run to execute your script.</span>
        ) : (
          output.map((entry, i) => (
            <div key={i} style={{ color: TYPE_COLORS[entry.type], lineHeight: 1.6 }}>
              {entry.type === 'error' && <span style={{ color: '#f44336' }}>Error: </span>}
              {entry.text}
            </div>
          ))
        )}
      </div>
    </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      height: heightRef.current,
      background: theme.bgStatusbar,
      borderTop: `1px solid ${theme.border}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div className="lvgl-drag-handle" onMouseDown={onMouseDown} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '2px 12px',
        borderBottom: `1px solid ${theme.border}`,
        minHeight: 26,
        flexShrink: 0,
      }}>
        <span style={{ color: theme.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
          Output
        </span>
        <button className="lvgl-clear-btn" onClick={onClear}>Clear</button>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 12px',
        fontFamily: 'monospace',
        fontSize: 12,
      }}>
        {output.length === 0 ? (
          <span style={{ color: theme.textMuted }}>No output yet. Click Run to execute your script.</span>
        ) : (
          output.map((entry, i) => (
            <div key={i} style={{ color: TYPE_COLORS[entry.type], lineHeight: 1.6 }}>
              {entry.type === 'error' && <span style={{ color: '#f44336' }}>Error: </span>}
              {entry.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
