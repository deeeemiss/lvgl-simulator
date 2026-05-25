import { useRef, useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';

export type SimulatorStatus = 'loading' | 'ready' | 'running' | 'error';

export interface SimulatorOutput {
  type: 'stdout' | 'stderr' | 'error';
  text: string;
}

interface UseSimulatorReturn {
  status: SimulatorStatus;
  output: SimulatorOutput[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  run: (code: string) => void;
  stop: () => void;
  clearOutput: () => void;
}

export function useSimulator(): UseSimulatorReturn {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<SimulatorStatus>('loading');
  const [output, setOutput] = useState<SimulatorOutput[]>([]);

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
        // flushSync: React 18 auto-batches cross-frame postMessages.
        // Without this, 'running' and 'ready' collapse into one render
        // and the button state never visually shows 'running'.
        // Clear output to hide the MicroPython REPL banner printed during init.
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
      }
    }

    window.addEventListener('micropython-print', handlePrint);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('micropython-print', handlePrint);
      window.removeEventListener('message', handleMessage);
    };
  }, [appendOutput]);

  const run = useCallback((code: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'run', code }, '*');
  }, []);

  const stop = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    flushSync(() => {
      setStatus('loading');
      setOutput([]);
    });
    const src = iframe.src;
    iframe.src = '';
    setTimeout(() => {
      if (iframeRef.current) iframeRef.current.src = src;
    }, 50);
  }, []);

  const clearOutput = useCallback(() => setOutput([]), []);

  return { status, output, iframeRef, run, stop, clearOutput };
}
