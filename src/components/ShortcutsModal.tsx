import { useState, useEffect, useRef } from 'react';

const SHORTCUTS = [
  { section: 'App' },
  { keys: ['Ctrl', 'Enter'], label: 'Run' },
  { keys: ['Ctrl', '.'],     label: 'Stop' },
  { section: 'Editor' },
  { keys: ['Ctrl', '/'],         label: 'Toggle comment' },
  { keys: ['Shift', 'Alt', 'F'], label: 'Format document' },
  { keys: ['Ctrl', 'D'],         label: 'Select next occurrence' },
  { keys: ['Alt', '↑ / ↓'],      label: 'Move line up / down' },
  { keys: ['Ctrl', 'Shift', 'K'],label: 'Delete line' },
  { keys: ['Ctrl', 'Z'],         label: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'],label: 'Redo' },
  { keys: ['Ctrl', 'F'],         label: 'Find' },
  { keys: ['Ctrl', 'H'],         label: 'Find & replace' },
  { keys: ['Ctrl', 'Shift', 'P'],label: 'Command palette' },
] as const;

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Keyboard shortcuts"
        style={{
          background: 'none',
          border: '1px solid #333',
          borderRadius: 4,
          color: '#666',
          cursor: 'pointer',
          width: 26, height: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600,
          transition: 'color 0.12s ease, border-color 0.12s ease',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = '#555'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#333'; }}
      >
        ?
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div ref={ref} style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 8,
            padding: '20px 24px',
            minWidth: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: '#ccc', fontWeight: 600, fontSize: 14, flex: 1 }}>Keyboard Shortcuts</span>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
              >×</button>
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {SHORTCUTS.map((row, i) => {
                  if ('section' in row) return (
                    <tr key={i}>
                      <td colSpan={2} style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, paddingTop: i === 0 ? 0 : 14, paddingBottom: 6 }}>
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
                              background: '#2d2d2d', border: '1px solid #444',
                              borderRadius: 3, padding: '1px 6px', fontSize: 11,
                              color: '#bbb', fontFamily: 'inherit',
                            }}>{k}</kbd>
                          ))}
                        </span>
                      </td>
                      <td style={{ color: '#aaa', fontSize: 12, paddingBottom: 6 }}>{row.label}</td>
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
