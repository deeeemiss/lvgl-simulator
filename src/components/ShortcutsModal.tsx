import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { section: 'App' },
  { keys: [MOD, 'Enter'], label: 'Run' },
  { keys: [MOD, '.'],     label: 'Stop' },
  { section: 'Editor' },
  { keys: [MOD, '/'],            label: 'Toggle comment' },
  { keys: ['Shift', 'Alt', 'F'], label: 'Format document' },
  { keys: [MOD, 'D'],            label: 'Select next occurrence' },
  { keys: ['Alt', '↑ / ↓'],      label: 'Move line up / down' },
  { keys: [MOD, 'Shift', 'K'],   label: 'Delete line' },
  { keys: [MOD, 'Z'],            label: 'Undo' },
  { keys: [MOD, 'Shift', 'Z'],   label: 'Redo' },
  { keys: [MOD, 'F'],            label: 'Find' },
  { keys: [MOD, 'H'],            label: 'Find & replace' },
  { keys: [MOD, 'Shift', 'P'],   label: 'Command palette' },
] as const;

export function ShortcutsModal() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open]);

  return (
    <>
      <button className="lvgl-icon-btn" onClick={() => setOpen(o => !o)} title="Keyboard shortcuts">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div ref={ref} style={{
            background: theme.bgToolbar,
            border: `1px solid ${theme.borderSubtle}`,
            borderRadius: 8, padding: '20px 24px', minWidth: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: 14, flex: 1 }}>Keyboard Shortcuts</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {SHORTCUTS.map((row, i) => {
                  if ('section' in row) return (
                    <tr key={i}>
                      <td colSpan={2} style={{ color: theme.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, paddingTop: i === 0 ? 0 : 14, paddingBottom: 6 }}>
                        {row.section}
                      </td>
                    </tr>
                  );
                  return (
                    <tr key={i}>
                      <td style={{ paddingBottom: 6, paddingRight: 24 }}>
                        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {row.keys.map((k, ki) => (
                            <kbd key={ki} style={{
                              background: 'var(--bg-surface)', border: '1px solid var(--border-input)',
                              borderRadius: 3, padding: '1px 6px', fontSize: 11,
                              color: 'var(--text-secondary)', fontFamily: 'inherit',
                            }}>{k}</kbd>
                          ))}
                        </span>
                      </td>
                      <td style={{ color: theme.textSecondary, fontSize: 12, paddingBottom: 6 }}>{row.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
