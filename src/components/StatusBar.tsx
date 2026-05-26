import { useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import type { SimulatorOutput } from '../hooks/useSimulator';

interface StatusBarProps {
  output: SimulatorOutput[];
  onClear: () => void;
  embedded?: boolean; // fill parent height, no drag handle, no fixed height
  onGotoLine?: (line: number) => void;
}

const TYPE_COLORS: Record<SimulatorOutput["type"], string> = {
  stdout:    '#ccc',
  stderr:    '#f0a500',
  error:     '#f44336',
  info:      '#60a0e0',
  separator: 'transparent',
};

const LS_KEY = 'lvgl-statusbar-height';
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 140;

// Matches: /path/to/file.c:12:5: error: message
const DIAGNOSTIC_RE = /(?:[\w/.\-]+):(\d+):\d+:\s*(error|warning|note):\s*(.*)/;

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

interface OutputLineProps {
  entry: SimulatorOutput;
  onGotoLine?: (line: number) => void;
}

function OutputLine({ entry, onGotoLine }: OutputLineProps) {
  if (entry.type === 'separator') {
    return <div style={{ borderTop: '1px solid #333', margin: '4px 0', opacity: 0.5 }} />;
  }

  const color = TYPE_COLORS[entry.type];

  // Only attempt diagnostic parsing for error/stderr lines
  if ((entry.type === 'error' || entry.type === 'stderr') && onGotoLine) {
    const match = entry.text.match(DIAGNOSTIC_RE);
    if (match) {
      const line = parseInt(match[1], 10);
      const kind = match[2];
      const message = match[3];
      const handleClick = () => onGotoLine(line);
      const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onGotoLine(line);
        }
      };
      return (
        <div style={{ color, lineHeight: 1.6 }}>
          {entry.type === 'error' && <span style={{ color: '#f44336' }}>Error: </span>}
          <span
            onClick={handleClick}
            onKeyDown={handleKey}
            role="button"
            tabIndex={0}
            title={`Jump to line ${line}`}
            style={{
              color: '#60a0e0',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            line {line}
          </span>
          <span style={{ color }}> — {kind}: {message}</span>
        </div>
      );
    }
  }

  return (
    <div style={{ color, lineHeight: 1.6 }}>
      {entry.type === 'error' && <span style={{ color: '#f44336' }}>Error: </span>}
      {entry.text}
    </div>
  );
}

export function StatusBar({ output, onClear, embedded, onGotoLine }: StatusBarProps) {
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
            <OutputLine key={i} entry={entry} onGotoLine={onGotoLine} />
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
            <OutputLine key={i} entry={entry} onGotoLine={onGotoLine} />
          ))
        )}
      </div>
    </div>
  );
}
