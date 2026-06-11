import { useTheme } from '../ThemeContext';

interface LanguageSelectorProps {
  language: string;
  onChange: (lang: string) => void;
  disabledLangs?: string[];
}

const LANGUAGES: { id: string; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'cpp',    label: 'C / C++' },
];

export function LanguageSelector({ language, onChange, disabledLangs = [] }: LanguageSelectorProps) {
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
        const disabled = disabledLangs.includes(lang.id);
        return (
          <button
            key={lang.id}
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            title={disabled ? 'C/C++ compilation requires a local server — see README' : undefined}
            onClick={() => { if (!selected && !disabled) onChange(lang.id); }}
            style={{
              height: 26,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: selected ? 600 : 500,
              lineHeight: '24px',
              background: selected ? theme.bgPanel : 'transparent',
              color: disabled ? theme.textSecondary : selected ? theme.textPrimary : theme.textSecondary,
              border: `1px solid ${selected ? theme.border : 'transparent'}`,
              borderRadius: 4,
              cursor: disabled ? 'not-allowed' : selected ? 'default' : 'pointer',
              opacity: disabled ? 0.45 : 1,
              transition: 'background 0.12s ease, color 0.12s ease, border-color 0.12s ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onMouseEnter={e => {
              if (!selected && !disabled) {
                e.currentTarget.style.background = theme.bgPanel;
                e.currentTarget.style.color = theme.textPrimary;
              }
            }}
            onMouseLeave={e => {
              if (!selected && !disabled) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
          >
            {lang.label}
            {disabled && (
              <span className="lvgl-locallocalbadge" style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.03em',
                padding: '1px 4px',
                borderRadius: 3,
                background: theme.border,
                color: theme.textSecondary,
                textTransform: 'uppercase',
              }}>
                local only
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
