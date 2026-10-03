import { useCallback, useEffect, useRef, useState } from "react";

export function useClipPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const serial = useRef(0);
  const frame = useRef(0);
  const timeout = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [repetition, setRepetition] = useState(0);
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const stop = useCallback(() => {
    serial.current++;
    cancelAnimationFrame(frame.current);
    window.clearTimeout(timeout.current);
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.pause();
    }
    setPlaying(false);
  }, []);
  const play = useCallback(async (url: string, start: number, end: number, options: {
    repeats?: number; gap?: number; rate?: number; onComplete?: () => void;
  } = {}) => {
    stop();
    setError(""); setErrorDetail("");
    const token = serial.current;
    // Reuse the element already allowed by the user's first playback gesture.
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    // Keep the media node in the document throughout loading and playback.
    // Desktop browsers may abort pending playback on detached media nodes.
    if (!audio.isConnected) {
      audio.hidden = true;
      audio.setAttribute("data-listening-player", "true");
      document.body.appendChild(audio);
    }
    const rangeStart = Math.max(0, start);
    let rangeEnd = end, pass = 0;
    const repeats = options.repeats ?? 1;
    const fail = (reason?: unknown) => {
      if (serial.current !== token) return;
      const failure = reason && typeof reason === "object" ? reason as { name?: unknown; message?: unknown } : null;
      const name = typeof failure?.name === "string" ? failure.name : "";
      const detail = typeof failure?.message === "string" ? failure.message : "";
      const code = audio.error?.code;
      stop();
      if (name === "NotAllowedError") {
        setError("O navegador bloqueou a reprodução automática. Clique no botão de ouvir ou iniciar a escuta para autorizar o áudio.");
      } else if (name === "RangeError") {
        setError("O intervalo deste trecho não corresponde à duração do áudio.");
      } else if (code === 3) {
        setError("O navegador não conseguiu decodificar este áudio. Tente reproduzi-lo novamente.");
      } else {
        setError("Não foi possível carregar este áudio. Confira sua conexão e tente novamente. Para estudar sem internet, prepare o modo offline na tela inicial.");
      }
      setErrorDetail(`${url} · ${name || `erro de mídia ${code ?? "desconhecido"}`}${detail || audio.error?.message ? `: ${detail || audio.error?.message}` : ""}`);
    };
    const fitRange = () => {
      if (serial.current !== token) return;
      if (Number.isFinite(audio.duration)) {
        if (rangeStart >= audio.duration) throw new RangeError("Início fora do arquivo");
        rangeEnd = Math.min(end, audio.duration);
      }
      if (rangeEnd <= rangeStart) throw new RangeError("Intervalo vazio");
      audio.currentTime = rangeStart;
    };
    try {
      if (!Number.isFinite(start) || !Number.isFinite(end) || rangeEnd <= rangeStart) throw new RangeError("Intervalo inválido");
      audio.preload = "auto";
      audio.playbackRate = options.rate ?? 1;
      audio.onerror = () => fail();
      audio.onloadedmetadata = () => { try { fitRange(); } catch (reason) { fail(reason); } };
      const source = new URL(url, document.baseURI).href;
      if (audio.src !== source || audio.error) audio.src = source;
      let interrupted = false;
      const run = async () => {
        if (serial.current !== token) return;
        let finished = false;
        const finish = () => {
          if (finished || serial.current !== token) return;
          finished = true;
          audio.pause(); cancelAnimationFrame(frame.current);
          pass++; setRepetition(pass);
          if (repeats === 0 || pass < repeats) timeout.current = window.setTimeout(() => void run().catch(fail), options.gap ?? 400);
          else { setPlaying(false); options.onComplete?.(); }
        };
        audio.onended = finish;
        const tick = () => {
          if (serial.current !== token || finished) return;
          setPosition(audio.currentTime);
          if (audio.currentTime >= rangeEnd - 0.015) finish();
          else frame.current = requestAnimationFrame(tick);
        };
        // Give the native player its initial seek position, then call play
        // before awaiting anything, while the user's click is still active.
        if (audio.readyState >= 1) fitRange();
        // Metadata handler performs the initial seek once the file is ready.
        setPosition(rangeStart); setRepetition(pass + 1);
        try {
          await audio.play();
        } catch (reason) {
          if (serial.current !== token) return;
          if (reason instanceof DOMException && reason.name === "AbortError" && !interrupted) {
            interrupted = true;
            if (!audio.isConnected) document.body.appendChild(audio);
            // Retry a browser interruption on the same attached, unlocked node.
            // Deliberate stop/navigation changes the token and never retries.
            await audio.play();
          } else throw reason;
        }
        if (serial.current !== token) return;
        setPlaying(true); frame.current = requestAnimationFrame(tick);
      };
      await run();
    } catch (reason) { fail(reason); }
  }, [stop]);
  useEffect(() => () => {
    serial.current++;
    cancelAnimationFrame(frame.current); window.clearTimeout(timeout.current);
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null; audio.onerror = null; audio.onloadedmetadata = null;
      audio.pause(); audio.removeAttribute("src"); audio.load(); audio.remove();
      audioRef.current = null;
    }
  }, []);
  return { playing, position, repetition, error, errorDetail, play, stop };
}
