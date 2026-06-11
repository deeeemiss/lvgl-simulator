import { useState, useCallback, useRef, useEffect } from 'react';
import { Editor, DEFAULT_CODE, DEFAULT_CODES } from './components/Editor';
import { LanguageSelector } from './components/LanguageSelector';
import { DisplayCanvas, RESOLUTIONS } from './components/DisplayCanvas';
import type { Resolution } from './components/DisplayCanvas';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { useSimulator } from './hooks/useSimulator';
import { useTheme } from './ThemeContext';

const AUTO_RUN_DELAY = 800;

export default function App() {
  const { theme } = useTheme();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [resolution, setResolution] = useState<Resolution>(RESOLUTIONS[0]);
  const [liveMode, setLiveMode] = useState(false);
  const [popoutOpen, setPopoutOpen] = useState(false);
  const [language, setLanguage] = useState('python');
  const { status, output, iframeRef, cArtifactId, run, stop, clearOutput } = useSimulator();
  const prevResolutionRef = useRef(resolution);
  const autoRunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCodeRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoEditorRef = useRef<any>(null);

  const handleGotoLine = useCallback((line: number) => {
    const ed = monacoEditorRef.current;
    if (!ed) return;
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column: 1 });
    ed.focus();
  }, []);

  // Helper: call run with current language + resolution
  const runWithContext = useCallback((c: string) => {
    run(c, language, resolution.width, resolution.height);
  }, [run, language, resolution]);

  const handleStop = useCallback(() => {
    setLiveMode(false);
    if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
    stop();
  }, [stop]);

  useEffect(() => {
    if (prevCodeRef.current === null) { prevCodeRef.current = code; return; }
    if (prevCodeRef.current === code) return;
    prevCodeRef.current = code;
    if (!liveMode) return;
    // Live mode only for Python (C needs explicit run)
    if (language === 'cpp') return;
    if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
    autoRunTimer.current = setTimeout(() => runWithContext(code), AUTO_RUN_DELAY);
    return () => { if (autoRunTimer.current) clearTimeout(autoRunTimer.current); };
  }, [code, runWithContext, liveMode, language]);

  const handleFileLoad = useCallback((text: string, lang: string) => {
    handleStop();
    setCode(text);
    setLanguage(lang);
  }, [handleStop]);

  const handleLanguageChange = useCallback((lang: string) => {
    handleStop();
    setCode(prev => {
      const isDefault = Object.values(DEFAULT_CODES).some(d => d === prev);
      return isDefault ? (DEFAULT_CODES[lang] ?? prev) : prev;
    });
    setLanguage(lang);
  }, [handleStop]);

  const handleRun = useCallback(() => { if (language !== 'cpp') setLiveMode(true); runWithContext(code); }, [runWithContext, code, language]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'Enter' || e.key === 's') { e.preventDefault(); setLiveMode(m => { if (!m) { runWithContext(code); return true; } return m; }); }
      if (e.key === '.')     { e.preventDefault(); handleStop(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runWithContext, code, handleStop]);

  const handleResolutionChange = useCallback((r: Resolution) => {
    if (r.label === prevResolutionRef.current.label) return;
    prevResolutionRef.current = r;
    handleStop();
    setResolution(r);
  }, [handleStop]);

  // Disable Run for C/C++ while compiling or running (must stop first)
  const isCompiling = status === 'compiling';
  const canRun = !liveMode && status === 'ready';
  const canRunC  = (language === 'cpp') && !isCompiling;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: theme.bgMain,
      color: theme.textPrimary,
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <Toolbar
        status={status}
        liveMode={liveMode}
        language={language}
        resolution={resolution}
        onRun={handleRun}
        onStop={handleStop}
        onResolutionChange={handleResolutionChange}
        onFileLoad={handleFileLoad}
        canRun={language === 'cpp' ? canRunC : canRun}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {(language === 'cpp') && (
            <div style={{
              padding: '4px 14px',
              background: theme.name === 'dark' ? '#c8a84b14' : '#c8a84b22',
              borderBottom: `1px solid ${theme.border}`,
              color: theme.name === 'dark' ? '#c8a84b' : '#7a6200',
              fontSize: 11,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Compiled server-side via emscripten · entry point: <code style={{ fontFamily: 'monospace', background: '#fff1', padding: '0 3px', borderRadius: 2 }}>lv_user_setup(void)</code>
              </span>
              <span style={{ paddingLeft: 16, opacity: 0.8 }}>No live preview — press Run after each change.</span>
            </div>
          )}
          <LanguageSelector
            language={language}
            onChange={handleLanguageChange}
            disabledLangs={import.meta.env.VITE_ENABLE_CPP === 'true' ? [] : ['cpp']}
          />
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor value={code} language={language} onChange={setCode} editorRef={monacoEditorRef} />
          </div>
        </div>

        <div style={{ width: 1, background: theme.borderSubtle, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: popoutOpen ? 'none' : undefined }}>
          <DisplayCanvas
            iframeRef={iframeRef}
            cArtifactId={cArtifactId}
            resolution={resolution}
            showPlaceholder={!liveMode && status !== 'compiling'}
            liveMode={liveMode}
            onPopoutChange={setPopoutOpen}
          />
        </div>

        {popoutOpen && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: `1px solid ${theme.borderSubtle}` }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, color: theme.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>
              Output — preview in external window
            </div>
            <StatusBar output={output} onClear={clearOutput} embedded onGotoLine={handleGotoLine} />
          </div>
        )}
      </div>

      {!popoutOpen && <StatusBar output={output} onClear={clearOutput} onGotoLine={handleGotoLine} />}
    </div>
  );
}
