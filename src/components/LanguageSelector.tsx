import { useTheme } from '../ThemeContext';

interface LanguageSelectorProps {
  language: string;
  onChange: (lang: string) => void;
}

const LANGUAGES: { id: string; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'c',      label: 'C'      },
  { id: 'cpp',    label: 'C++'    },
];

export function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  const { theme } = useTheme();

  return (
    <div
      role="tablist"
      aria-label="Language"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 14px',
        background: theme.bgToolbar,
        borderBottom: `1px solid ${theme.border}`,
        flexShrink: 0,
      }}
    >
      {LANGUAGES.map(lang => {
        const selected = language === lang.id;
        return (
          <button
            key={lang.id}
            role="tab"
            aria-selected={selected}
            onClick={() => { if (!selected) onChange(lang.id); }}
            style={{
              height: 26,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: selected ? 600 : 500,
              lineHeight: '24px',
              background: selected ? theme.bgPanel : 'transparent',
              color: selected ? theme.textPrimary : theme.textSecondary,
              border: `1px solid ${selected ? theme.border : 'transparent'}`,
              borderRadius: 4,
              cursor: selected ? 'default' : 'pointer',
              transition: 'background 0.12s ease, color 0.12s ease, border-color 0.12s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (!selected) {
                e.currentTarget.style.background = theme.bgPanel;
                e.currentTarget.style.color = theme.textPrimary;
              }
            }}
            onMouseLeave={e => {
              if (!selected) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}
