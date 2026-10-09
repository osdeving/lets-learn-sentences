import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder } from "../hooks/useRecorder";
import { compareSpeech, type SpeechMatch } from "../lib/speechMatch";

interface RecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface RecognitionEvent {
  results: { length: number; [index: number]: RecognitionResult };
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;
type RecognitionStatus = "idle" | "listening" | "processing" | "done" | "error";

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browser = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function recognitionError(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") return "O microfone ou o reconhecimento foi bloqueado. Verifique a permissão do navegador e tente novamente.";
  if (error === "audio-capture") return "O navegador não conseguiu acessar o microfone. Verifique se ele está conectado e disponível.";
  if (error === "no-speech") return "Nenhuma fala foi reconhecida. Tente novamente falando em inglês perto do microfone.";
  if (error === "network") return "O serviço de reconhecimento não respondeu. Verifique a conexão ou use a gravação local.";
  if (error === "language-not-supported") return "O reconhecimento de inglês não está disponível neste navegador. Use a gravação local.";
  return "Não foi possível concluir o reconhecimento. Tente novamente ou use a gravação local.";
}

export function MrEnglishSpeak({ itemKey, text, onPlayOriginal, onBeforeCapture }: {
  itemKey: string;
  text: string;
  onPlayOriginal: () => void;
  onBeforeCapture: () => void;
}) {
  const recorder = useRecorder();
  const [pendingRecording, setPendingRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const [match, setMatch] = useState<SpeechMatch | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const generationRef = useRef(0);
  const recordingGenerationRef = useRef(0);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishTimerRef = useRef<number | undefined>(undefined);
  const limitTimerRef = useRef<number | undefined>(undefined);
  const supported = Boolean(recognitionConstructor());
  const capturing = status === "listening" || status === "processing";
  const recording = recorder.status === "recording";

  const cancelRecognition = useCallback(() => {
    generationRef.current += 1;
    if (finishTimerRef.current !== undefined) window.clearTimeout(finishTimerRef.current);
    if (limitTimerRef.current !== undefined) window.clearTimeout(limitTimerRef.current);
    finishTimerRef.current = undefined;
    limitTimerRef.current = undefined;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch { /* Already stopped. */ }
    }
  }, []);

  useEffect(() => {
    setStatus("idle"); setHeard(""); setError(""); setMatch(null);
    setPendingRecording(false); setRecordingError("");
    return () => {
      recordingGenerationRef.current += 1;
      cancelRecognition();
      localAudioRef.current?.pause();
      recorder.clear();
    };
  }, [itemKey, cancelRecognition, recorder.clear]);

  const toggleRecording = async () => {
    if (pendingRecording || capturing) return;
    const generation = recordingGenerationRef.current;
    setRecordingError("");
    onBeforeCapture();
    localAudioRef.current?.pause();
    setPendingRecording(true);
    const result = await recorder.toggle();
    if (generation !== recordingGenerationRef.current) return;
    setPendingRecording(false);
    if (result === "denied") setRecordingError("Não foi possível acessar o microfone. Verifique a permissão do navegador e tente novamente.");
    if (result === "unsupported") setRecordingError("Este navegador não permite gravação de áudio. Tente outro navegador com acesso ao microfone.");
  };

  const startRecognition = () => {
    const Constructor = recognitionConstructor();
    if (!Constructor || recording || pendingRecording) return;
    cancelRecognition();
    onBeforeCapture();
    localAudioRef.current?.pause();
    const generation = generationRef.current;
    let recognition: Recognition;
    try { recognition = new Constructor(); } catch {
      setError("O reconhecimento não está disponível. Use a gravação local ou tente outro navegador.");
      setStatus("error");
      return;
    }
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    setStatus("listening"); setError(""); setHeard(""); setMatch(null);
    let finalText = "";
    const current = () => generation === generationRef.current && recognitionRef.current === recognition;
    recognition.onresult = (event) => {
      if (!current()) return;
      const interim: string[] = [];
      const finalized: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result[0]?.transcript?.trim();
        if (!phrase) continue;
        (result.isFinal ? finalized : interim).push(phrase);
      }
      finalText = finalized.join(" ");
      setHeard([...finalized, ...interim].join(" "));
    };
    recognition.onerror = (event) => {
      if (!current()) return;
      cancelRecognition();
      setError(recognitionError(event.error));
      setStatus("error");
    };
    recognition.onend = () => {
      if (!current()) return;
      cancelRecognition();
      if (finalText.trim()) {
        setHeard(finalText); setMatch(compareSpeech(text, finalText)); setStatus("done");
      } else {
        setError(recognitionError("no-speech")); setStatus("error");
      }
    };
    try {
      recognition.start();
      if (current()) {
        limitTimerRef.current = window.setTimeout(() => {
          if (!current()) return;
          stopRecognition();
        }, 60_000);
      }
    } catch {
      cancelRecognition();
      setError("O navegador não iniciou o reconhecimento. Verifique a permissão do microfone e tente novamente.");
      setStatus("error");
    }
  };

  function stopRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    const generation = generationRef.current;
    if (limitTimerRef.current !== undefined) window.clearTimeout(limitTimerRef.current);
    limitTimerRef.current = undefined;
    setStatus("processing");
    try { recognition.stop(); } catch {
      cancelRecognition(); setError(recognitionError("network")); setStatus("error");
      return;
    }
    if (generation !== generationRef.current) return;
    finishTimerRef.current = window.setTimeout(() => {
      if (generation !== generationRef.current) return;
      cancelRecognition(); setError(recognitionError("network")); setStatus("error");
    }, 8_000);
  }

  const playOriginal = () => {
    localAudioRef.current?.pause();
    onBeforeCapture();
    onPlayOriginal();
  };

  return (
    <section className="mr-speak" aria-labelledby="mr-speak-title">
      <h3 id="mr-speak-title">Speak · fale a palavra ou sentença</h3>
      <p className="mr-speak-card" lang="en">{text}</p>
      <div className="mr-speak-actions">
        <button type="button" onClick={playOriginal} disabled={capturing || recording || pendingRecording}>Ouvir original</button>
        <button type="button" onClick={() => { void toggleRecording(); }} disabled={!recorder.supported || capturing || pendingRecording}>
          {pendingRecording ? "Acessando microfone…" : recording ? "Parar gravação" : "Gravar minha voz localmente"}
        </button>
      </div>
      <p className="mr-speak-note">A gravação fica neste navegador. O app não a envia. Ouça sua voz e compare com o original.</p>
      {!recorder.supported && <p className="mr-speak-note">A gravação local não está disponível neste navegador.</p>}
      {recording && <p role="status" className="mr-speak-status">Gravando. Clique em Parar gravação quando terminar.</p>}
      {recordingError && <p role="alert" className="mr-speak-error">{recordingError}</p>}
      {recorder.recordingURL && !capturing && <div className="mr-speak-recording">
        <label htmlFor="mr-speak-recording">Sua gravação</label>
        <audio id="mr-speak-recording" ref={localAudioRef} controls src={recorder.recordingURL} onPlay={onBeforeCapture} />
        <button type="button" onClick={recorder.clear}>Apagar gravação</button>
      </div>}
      <div className="mr-speak-recognition">
        <h4>Comparação do texto falado</h4>
        <p className="mr-speak-note">O reconhecimento tenta identificar as palavras ditas em inglês. O resultado compara texto e pode errar; não mede pronúncia nem semelhança da voz.</p>
        {supported ? <>
          <p className="mr-speak-note">Ao iniciar a comparação, o navegador pode enviar seu áudio ao serviço de reconhecimento e precisar de internet. <a href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition" target="_blank" rel="noreferrer">Como funciona</a></p>
          <button type="button" onClick={capturing ? stopRecognition : startRecognition} disabled={recording || pendingRecording || status === "processing"}>
            {status === "listening" ? "Concluir comparação" : status === "processing" ? "Processando fala…" : "Comparar com reconhecimento de voz"}
          </button>
        </> : <p className="mr-speak-note">A comparação automática não está disponível neste navegador. Use a gravação local para se ouvir.</p>}
        {status === "listening" && <p role="status" className="mr-speak-status">Ouvindo. Fale o texto do card em inglês e conclua a comparação.</p>}
        {error && <p role="alert" className="mr-speak-error">{error}</p>}
        {heard && <p className="mr-speak-heard">Reconhecido: <span lang="en">{heard}</span></p>}
        {match && <div className="mr-speak-result" aria-live="polite">
          <p><strong>{match.exact ? "O texto reconhecido coincide com o card." : `${match.score}% de correspondência do texto`}</strong></p>
          <p className="mr-speak-note">{match.matched} de {match.expectedTokens.length} palavras coincidentes após normalizar pontuação e contrações comuns.</p>
          {match.missing.length > 0 && <p>Ausentes ou diferentes: <span lang="en">{match.missing.join(", ")}</span></p>}
          {match.extra.length > 0 && <p>Extras ou diferentes: <span lang="en">{match.extra.join(", ")}</span></p>}
        </div>}
      </div>
    </section>
  );
}
