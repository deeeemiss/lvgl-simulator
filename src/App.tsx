import { useState, useCallback, useRef, useEffect } from 'react';
import { Editor, DEFAULT_CODE } from './components/Editor';
import { DisplayCanvas, RESOLUTIONS } from './components/DisplayCanvas';
import type { Resolution } from './components/DisplayCanvas';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { useSimulator } from './hooks/useSimulator';

const AUTO_RUN_DELAY = 800;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [resolution, setResolution] = useState<Resolution>(RESOLUTIONS[0]);
  const [liveMode, setLiveMode] = useState(false);
  const [popoutOpen, setPopoutOpen] = useState(false);
  const { status, output, iframeRef, run, stop, clearOutput } = useSimulator();
  const prevResolutionRef = useRef(resolution);
  const autoRunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCodeRef = useRef<string | null>(null);
  const reenterLiveRef = useRef(false);

  useEffect(() => {
    if (status === 'ready' && reenterLiveRef.current) {
      reenterLiveRef.current = false;
      setLiveMode(true);
      run(code);
    }
  }, [status, run, code]);

  useEffect(() => {
    if (prevCodeRef.current === null) { prevCodeRef.current = code; return; }
    if (prevCodeRef.current === code) return;
    prevCodeRef.current = code;
    if (!liveMode) return;
    if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
    autoRunTimer.current = setTimeout(() => run(code), AUTO_RUN_DELAY);
    return () => { if (autoRunTimer.current) clearTimeout(autoRunTimer.current); };
  }, [code, run, liveMode]);

  const handleFileLoad = useCallback((text: string) => { setCode(text); }, []);

  const handleRun = useCallback(() => { setLiveMode(true); run(code); }, [run, code]);

  const handleStop = useCallback(() => {
    setLiveMode(false);
    reenterLiveRef.current = false;
    if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
    stop();
  }, [stop]);

  const handleResolutionChange = useCallback((r: Resolution) => {
    if (r.label === prevResolutionRef.current.label) return;
    prevResolutionRef.current = r;
    if (liveMode) { reenterLiveRef.current = true; setLiveMode(false); }
    setResolution(r);
  }, [liveMode]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#1e1e1e',
      color: '#ccc',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <Toolbar
        status={status}
        liveMode={liveMode}
        resolution={resolution}
        onRun={handleRun}
        onStop={handleStop}
        onResolutionChange={handleResolutionChange}
        onFileLoad={handleFileLoad}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor — always visible */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Editor value={code} onChange={setCode} />
        </div>

        <div style={{ width: 1, background: '#333', flexShrink: 0 }} />

        {/* Preview panel: hidden (display:none) when popout open so iframe/WASM stays alive */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: popoutOpen ? 'none' : undefined }}>
          <DisplayCanvas
            iframeRef={iframeRef}
            resolution={resolution}
            showPlaceholder={!liveMode}
            liveMode={liveMode}
            onPopoutChange={setPopoutOpen}
          />
        </div>

        {/* When popped out: show StatusBar in the right panel */}
        {popoutOpen && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #333' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a2a', color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>
              Output — preview in external window
            </div>
            <StatusBar output={output} onClear={clearOutput} embedded />
          </div>
        )}
      </div>

      {/* StatusBar at bottom only when not in popout mode */}
      {!popoutOpen && <StatusBar output={output} onClear={clearOutput} />}
    </div>
  );
}
