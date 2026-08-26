import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  waveform: number[];
  error: string | null;
}

function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  const types = [
    'audio/mp4',
    'audio/aac',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    } catch {
      // ignore
    }
  }
  return '';
}

export function useAudioRecorder() {
  const [recordingState, setRecordingState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    waveform: [],
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const selectedMimeTypeRef = useRef<string>('audio/mp4');
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // 1. Request microphone stream with mobile & iPhone optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // 2. Setup AudioContext for visualizer with Safari resume() support
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      
      let audioCtx: AudioContext | null = null;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }
        audioContextRef.current = audioCtx;

        try {
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
        } catch (ctxErr) {
          console.warn('AudioContext visualizer setup warning:', ctxErr);
        }
      }

      // 3. Find compatible mimeType for Safari iOS / Android / Chrome
      const supportedType = getSupportedMimeType();
      selectedMimeTypeRef.current = supportedType || 'audio/mp4';

      let mediaRecorder: MediaRecorder;
      const options: MediaRecorderOptions = {};
      if (supportedType) {
        options.mimeType = supportedType;
      }

      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (recErr) {
        console.warn('Fallback to standard MediaRecorder without options:', recErr);
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording with timeslice
      try {
        mediaRecorder.start(200);
      } catch {
        mediaRecorder.start();
      }

      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        waveform: [0.3, 0.5, 0.4, 0.6],
        error: null,
      });

      // 4. Accurate timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingState((prev) => ({ ...prev, duration: elapsed }));
      }, 100);

      // 5. Live waveform visualizer
      const sampleWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (dataArray.length || 1) / 255;
        const clamped = Math.max(0.18, Math.min(1.0, avg * 2.2));

        setRecordingState((prev) => {
          const nextWave = [...prev.waveform.slice(-24), clamped];
          return { ...prev, waveform: nextWave };
        });

        animFrameRef.current = requestAnimationFrame(sampleWaveform);
      };

      sampleWaveform();
    } catch (err: unknown) {
      console.error('Erreur accès microphone (Safari/Chrome/iOS):', err);
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Veuillez autoriser le microphone dans les réglages de Safari ou de votre navigateur.';
      setRecordingState((prev) => ({
        ...prev,
        isRecording: false,
        error: errMsg,
      }));
    }
  }, []);

  const stopRecording = useCallback((): Promise<{ blob: Blob; url: string; duration: number }> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        reject(new Error('Enregistreur non actif'));
        return;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      recorder.onstop = () => {
        const mimeType = selectedMimeTypeRef.current || 'audio/mp4';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const finalDuration = Math.max(1, Math.round(recordingState.duration || 1));

        setRecordingState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob: blob,
          audioUrl: url,
        }));

        // Stop all tracks to free up the microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (recorder.stream) {
          recorder.stream.getTracks().forEach((track) => track.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(console.error);
        }

        resolve({ blob, url, duration: finalDuration });
      };

      try {
        recorder.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
        // Fallback resolve if stop fails
        const mimeType = selectedMimeTypeRef.current || 'audio/mp4';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, duration: Math.max(1, Math.round(recordingState.duration || 1)) });
      }
    });
  }, [recordingState.duration]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      waveform: [],
      error: null,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  return {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
