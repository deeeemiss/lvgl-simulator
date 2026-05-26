import { useRef, useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';

export type SimulatorStatus = 'loading' | 'ready' | 'running' | 'error' | 'compiling';

export interface SimulatorOutput {
  type: 'stdout' | 'stderr' | 'error' | 'info';
  text: string;
}

interface UseSimulatorReturn {
  status: SimulatorStatus;
  output: SimulatorOutput[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** When set, DisplayCanvas should load c-runner.html with this artifact id */
  cArtifactId: string | null;
  run: (code: string, language?: string, width?: number, height?: number) => void;
  stop: () => void;
  clearOutput: () => void;
}

export function useSimulator(): UseSimulatorReturn {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<SimulatorStatus>('loading');
  const [output, setOutput] = useState<SimulatorOutput[]>([]);
  const [cArtifactId, setCArtifactId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const compileStartRef = useRef<number>(0);

  const appendOutput = useCallback((entry: SimulatorOutput) => {
    setOutput(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    function handlePrint(event: Event) {
      const detail = (event as CustomEvent & { detail: Uint8Array }).detail;
      if (!detail) return;
      const text = new TextDecoder().decode(detail).replace(/\r?\n$/, '');
      if (text) appendOutput({ type: 'stdout', text });
    }

    function handleMessage(event: MessageEvent) {
      if (!event.data) return;
      const { type } = event.data;
      if (type === 'ready') {
        flushSync(() => { setStatus('ready'); setOutput([]); });
      } else if (type === 'status') {
        flushSync(() => setStatus(event.data.status as SimulatorStatus));
      } else if (type === 'error') {
        flushSync(() => {
          appendOutput({ type: 'error', text: event.data.message ?? 'Unknown error' });
          setStatus('error');
        });
      } else if (type === 'print') {
        appendOutput({ type: 'stdout', text: event.data.text });
      } else if (type === 'stdout') {
        appendOutput({ type: 'stdout', text: event.data.text });
      } else if (type === 'stderr') {
        appendOutput({ type: 'stderr', text: event.data.text });
      }
    }

    window.addEventListener('micropython-print', handlePrint);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('micropython-print', handlePrint);
      window.removeEventListener('message', handleMessage);
    };
  }, [appendOutput]);

  const run = useCallback((
    code: string,
    language = 'python',
    width = 480,
    height = 320,
  ) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (language === 'cpp') {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      compileStartRef.current = Date.now();
      flushSync(() => {
        setStatus('compiling');
        setOutput([{ type: 'info', text: `Compiling C/C++ (${width}×${height})…` }]);
      });

      fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, width, height }),
        signal: ctrl.signal,
      })
        .then(resp => resp.json().then(data => ({ ok: resp.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error ?? 'Compilation failed');
          const id = data.id as string;
          const cached = data.cached as boolean;
          const elapsed = Date.now() - compileStartRef.current;
          appendOutput({ type: 'info', text: cached ? 'Cache hit — loading…' : 'Compilation successful — loading…' });
          appendOutput({ type: 'info', text: `Compiled in ${(elapsed / 1000).toFixed(1)}s${cached ? ' (cached)' : ''}` });
          // Update React state — DisplayCanvas will set the iframe src reactively.
          // This avoids the imperative iframe.src = ... getting clobbered by React re-renders.
          setCArtifactId(id);
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          const msg = String(err.message || err);
          flushSync(() => {
            appendOutput({ type: 'error', text: msg });
            setStatus('error');
          });
        });
    } else {
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage({ type: 'run', code }, '*');
    }
  }, [appendOutput]);

  const stop = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    const iframe = iframeRef.current;
    if (!iframe) return;
    flushSync(() => {
      setStatus('loading');
      setCArtifactId(null); // revert to python runner
      setOutput([]);
    });
    // Force micropython iframe to reload by bouncing src
    const src = iframe.src;
    iframe.src = '';
    setTimeout(() => { if (iframeRef.current) iframeRef.current.src = src; }, 50);
  }, []);

  const clearOutput = useCallback(() => setOutput([]), []);

  return { status, output, iframeRef, cArtifactId, run, stop, clearOutput };
}
