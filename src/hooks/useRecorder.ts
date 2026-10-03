import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "recording" | "ready";

export interface RecorderController {
  supported: boolean;
  status: RecorderStatus;
  recordingURL: string;
  toggle: () => Promise<"started" | "stopped" | "unsupported" | "denied">;
  play: () => void;
  clear: () => void;
}

export function useRecorder(): RecorderController {
  const supported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined";
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [recordingURL, setRecordingURL] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef("");
  const generationRef = useRef(0);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clear = useCallback(() => {
    generationRef.current += 1;
    playbackRef.current?.pause();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    stopStream();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setRecordingURL("");
    setStatus("idle");
  }, [stopStream]);

  const toggle = useCallback(async () => {
    if (!supported) return "unsupported" as const;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return "stopped" as const;
    }
    try {
      clear();
      const generation = generationRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return "denied" as const;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (generation !== generationRef.current) return;
        if (event.data.size) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        if (generation !== generationRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setRecordingURL(url);
        setStatus("ready");
        stopStream();
      });
      recorder.start();
      setStatus("recording");
      return "started" as const;
    } catch {
      stopStream();
      setStatus("idle");
      return "denied" as const;
    }
  }, [clear, stopStream, supported]);

  const play = useCallback(() => {
    playbackRef.current?.pause();
    if (urlRef.current) {
      playbackRef.current = new Audio(urlRef.current);
      void playbackRef.current.play().catch(() => undefined);
    }
  }, []);

  useEffect(() => clear, [clear]);

  return { supported, status, recordingURL, toggle, play, clear };
}
