'use client';

// Réplica de `app/voice-input.tsx`. El dictado usa el reconocimiento de voz
// del navegador cuando existe; el panel lateral también puede "dictar" una
// frase escrita o sugerida (`state.dictation`), que aparece palabra por
// palabra como si se estuviera transcribiendo.

import { Mic, Pause, Play, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeMoneyText } from '../app/voiceParser';
import type { DemoApi } from '../useDemo';
import { NAV_H, PressableScale, absFill } from './ui';

const ORB = 192;

type Status = 'idle' | 'listening' | 'processing' | 'error';

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function VoiceOrb({ listening }: { listening: boolean }) {
  return (
    <div style={{ position: 'relative', width: ORB + 80, height: ORB + 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          width: ORB + 80,
          height: ORB + 80,
          borderRadius: 9999,
          background: 'rgba(19,91,236,0.1)',
          opacity: listening ? 0.18 : 0.08,
          animation: listening ? 'orb-pulse-2 2250ms ease-in-out infinite' : undefined,
          transition: 'opacity 300ms',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: ORB + 32,
          height: ORB + 32,
          borderRadius: 9999,
          background: 'rgba(19,91,236,0.2)',
          opacity: listening ? 0.35 : 0.15,
          animation: listening ? 'orb-pulse-1 1800ms ease-in-out infinite' : undefined,
          transition: 'opacity 300ms',
        }}
      />
      <div
        style={{
          width: ORB,
          height: ORB,
          borderRadius: 9999,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #3B82F6 0%, #135BEC 50%, #1E3A8A 100%)',
          boxShadow: '0 16px 40px rgba(19,91,236,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'zoom-in 400ms both',
        }}
      >
        <Mic size={52} color="#FFFFFF" strokeWidth={1.8} />
      </div>
    </div>
  );
}

export function VoiceInput({ api }: { api: DemoApi }) {
  const { state, dispatch } = api;
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const rec = useRef<Recognition | null>(null);
  const heard = useRef('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const statusRef = useRef<Status>('idle');
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    // Solo en el cliente: el servidor no sabe si el navegador reconoce voz.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognition() !== null);
    return () => {
      clearTimers();
      rec.current?.stop();
    };
  }, []);

  // `handleDone`: muestra "✓ Procesado" un segundo y procesa la frase.
  const done = useCallback(
    (text: string) => {
      const trimmed = normalizeMoneyText(text.trim());
      if (!trimmed) return;
      setFinalText(trimmed);
      setStatus('processing');
      timers.current.push(setTimeout(() => dispatch({ type: 'voiceResult', quote: trimmed }), 1000));
    },
    [dispatch],
  );

  // Frase enviada desde el panel lateral: se "transcribe" palabra por palabra.
  useEffect(() => {
    const d = state.dictation;
    if (!d) return;
    clearTimers();
    rec.current?.stop();
    const words = d.text.trim().split(/\s+/);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setStatus('listening');
    setTranscript('');
    words.forEach((_, i) => {
      timers.current.push(setTimeout(() => setTranscript(normalizeMoneyText(words.slice(0, i + 1).join(' '))), 250 + i * 230));
    });
    timers.current.push(setTimeout(() => done(d.text), 250 + words.length * 230 + 700));
  }, [state.dictation, done]);

  const listen = () => {
    if (status === 'processing') return;
    const Ctor = getRecognition();
    if (!Ctor) {
      setStatus('error');
      setError('Tu navegador no permite dictar: escribe la frase en el panel.');
      return;
    }
    if (status === 'listening') {
      clearTimers();
      rec.current?.stop();
      return;
    }
    const r = new Ctor();
    r.lang = 'es-CO';
    r.interimResults = true;
    r.continuous = false;
    heard.current = '';
    r.onresult = (e) => {
      const results = Array.from(e.results);
      heard.current = results.map((res) => res[0].transcript).join(' ');
      if (results.some((res) => res.isFinal)) {
        const text = heard.current;
        heard.current = '';
        done(text);
      } else setTranscript(normalizeMoneyText(heard.current));
    };
    r.onend = () => {
      if (statusRef.current === 'processing') return;
      if (heard.current.trim()) done(heard.current);
      else setStatus('idle');
    };
    r.onerror = (e) => {
      setStatus('error');
      setError(e.error === 'not-allowed' ? 'Concede acceso al micrófono en Ajustes.' : 'No te escuché. ¿Puedes repetirlo?');
    };
    rec.current = r;
    setError(null);
    setTranscript('');
    setStatus('listening');
    try {
      r.start();
    } catch {
      setStatus('error');
      setError('No se pudo iniciar el micrófono.');
    }
  };

  const listening = status === 'listening';
  const processing = status === 'processing';
  const display = processing ? finalText || transcript : transcript;
  const words = display ? display.trim().split(/\s+/) : [];
  const statusLabel = processing
    ? 'Analizando tu registro...'
    : listening
      ? 'Transcribiendo...'
      : status === 'error'
        ? (error ?? 'No te escuché. ¿Puedes repetirlo?')
        : transcript
          ? 'Toca para continuar o terminar'
          : 'Toca el micrófono para hablar';

  return (
    <div style={{ ...absFill, background: '#101622', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...absFill, background: 'rgba(15,23,42,0.55)' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: `${28 + 12}px 24px 16px` }}>
        <PressableScale
          onPress={() => {
            clearTimers();
            rec.current?.stop();
            dispatch({ type: 'back' });
          }}
          label="Cerrar"
          style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </PressableScale>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <VoiceOrb listening={listening} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 36, gap: 10, width: '100%', maxHeight: 200 }}>
          {listening && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, animation: 'fade-in 300ms both' }}>
              <Sparkles size={12} color="#135BEC" strokeWidth={2} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#135BEC', letterSpacing: 1.4 }}>Escuchando</span>
            </span>
          )}
          {processing && (
            <span style={{ background: 'rgba(34,197,94,0.15)', padding: '4px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 700, color: '#4ADE80', letterSpacing: 0.5, animation: 'fade-in 200ms both' }}>
              ✓ Procesado
            </span>
          )}
          {display ? (
            processing ? (
              <span style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', textAlign: 'center', lineHeight: '32px', letterSpacing: -0.3, maxHeight: 140, overflow: 'hidden', animation: 'fade-in 150ms both' }}>
                &quot;{display}&quot;
              </span>
            ) : (
              <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', maxHeight: 140, overflow: 'hidden' }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.45)', lineHeight: '34px' }}>&quot;</span>
                {words.map((w, i) => (
                  <span key={i} style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', lineHeight: '34px', letterSpacing: -0.3, whiteSpace: 'pre', animation: 'fade-in 220ms both' }}>
                    {w}
                    {i < words.length - 1 ? ' ' : ''}
                  </span>
                ))}
                <span style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.45)', lineHeight: '34px' }}>&quot;</span>
              </span>
            )
          ) : (
            status !== 'error' && (
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: '28px', whiteSpace: 'pre-line', animation: 'fade-in 300ms both' }}>
                {'Di algo como:\n"McDonald\'s 25 mil ayer"'}
              </span>
            )
          )}
          <span style={{ fontSize: 14, fontWeight: 500, textAlign: 'center', letterSpacing: 0.2, color: status === 'error' ? '#F87171' : processing ? '#4ADE80' : '#94A3B8' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: `8px 0 ${NAV_H + 32}px` }}>
        <button
          type="button"
          onClick={listen}
          aria-label={listening ? 'Pausar dictado' : 'Dictar'}
          aria-pressed={listening}
          className="cursor-pointer transition-transform active:scale-[0.96] active:opacity-80"
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: '#135BEC',
            border: '4px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 20px rgba(19,91,236,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundClip: 'padding-box',
          }}
        >
          {listening ? (
            <Pause size={30} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
          ) : processing ? (
            <Play size={30} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
          ) : (
            <Mic size={30} color="#FFFFFF" strokeWidth={2} />
          )}
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B', letterSpacing: 1.8 }}>
          {listening ? 'TOCA PARA PAUSAR' : processing ? 'PROCESANDO...' : transcript ? 'TOCA PARA CONTINUAR' : 'TOCA PARA INICIAR'}
        </span>
        {!supported && status === 'idle' && <span className="sr-only">Este navegador no permite dictar; usa el panel lateral.</span>}
      </div>
    </div>
  );
}
