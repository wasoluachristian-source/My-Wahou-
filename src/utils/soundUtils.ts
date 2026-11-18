/**
 * Sound & Notification Utilities for my Wahou
 * Synthesizes crisp, native-feeling audio clicks/pops with Web Audio API
 * and handles WhatsApp-style push notifications & browser notifications.
 */
import { getCustomRingtoneObjectUrl } from './ringtoneStorage';

// Shared AudioContext instance (lazy initialized on first user interaction)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.warn('AudioContext initialization failed:', err);
    return null;
  }
}

/**
 * Son de frappe au clavier (Key Typing Tap) feutré et agréable comme sur iPhone/iOS
 */
export function playKeyTypeSound(volume: number = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Subtle pitch variation for organic typing feel
    const randomFreq = 420 + (Math.random() * 60 - 30);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(randomFreq, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.025);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {
    // Ignore audio constraints
  }
}

/**
 * Son de tap UI interactif (Boutons, onglets, sélecteurs, actions)
 */
export function playUiTapSound(volume: number = 0.12) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {
    // Ignore
  }
}

/**
 * Son de navigation fluide entre espaces et vues (Swish / Soft Click)
 */
export function playUiNavSound(volume: number = 0.15) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.035);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch (e) {}
}

/**
 * Clic tactile court et feutré (Haptic feedback click)
 */
export function playHapticClickSound(volume: number = 0.1) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.015);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch (e) {}
}

/**
 * Produit un son de "clik / pop" feutré et ultra-satisfaisant (style WhatsApp / iOS UI)
 * lors de la réception ou de l'envoi d'un message.
 */
export function playMessageClickSound(volume: number = 0.25) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // High click component
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    // Subtle wooden body resonance
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.035);

    gain2.gain.setValueAtTime(volume * 0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now);
    osc2.stop(now + 0.04);
  } catch (e) {
    // Ignore audio playback constraints
  }
}

/**
 * Son de notification double "pop-clik" lors de l'arrivée d'un message important
 */
export function playNotificationChime(volume: number = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(650, now);
    osc1.frequency.exponentialRampToValueAtTime(850, now + 0.06);

    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.07);

    // Tone 2 (Quick follow-up)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(980, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.16);

    gain2.gain.setValueAtTime(volume * 1.1, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.18);
  } catch (e) {
    // Ignore
  }
}

/**
 * Son discret d'envoi de message (Tick doux)
 */
export function playMessageSentSound(volume: number = 0.2) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.03);

    gain.gain.setValueAtTime(volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {
    // Ignore
  }
}

/**
 * Joue une sonnerie d'appel sortant réaliste (Tonalité d'appel téléphonique)
 */
export function startOutgoingRingtone(): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let timerId: any = null;

  const playToneBurst = () => {
    if (!isPlaying) return;
    try {
      const now = ctx.currentTime;

      // Frequency 1: 440 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(440, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.setValueAtTime(0.12, now + 1.2);
      gain1.gain.linearRampToValueAtTime(0.0001, now + 1.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.3);

      // Frequency 2: 480 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(480, now);
      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.setValueAtTime(0.12, now + 1.2);
      gain2.gain.linearRampToValueAtTime(0.0001, now + 1.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 1.3);
    } catch (e) {}

    timerId = setTimeout(playToneBurst, 3500);
  };

  playToneBurst();

  return () => {
    isPlaying = false;
    if (timerId) clearTimeout(timerId);
  };
}

export interface RingtonePreset {
  id: string;
  name: string;
  style: string;
  description: string;
  wave: OscillatorType;
  cycleMs: number;
  notes: Array<{ freq: number; time: number; dur: number; vol?: number }>;
}

/**
 * 10 sonneries exclusives propres à l'application my Wahou
 */
export const MY_WAHOU_RINGTONES: RingtonePreset[] = [
  {
    id: 'wahou_1',
    name: 'Carillon my Wahou',
    style: 'Signature',
    description: 'Mélodie cristalline originale de my Wahou',
    wave: 'triangle',
    cycleMs: 2800,
    notes: [
      { freq: 659.25, time: 0, dur: 0.18 },
      { freq: 830.61, time: 0.2, dur: 0.18 },
      { freq: 987.77, time: 0.4, dur: 0.22 },
      { freq: 1318.51, time: 0.65, dur: 0.35 },
      { freq: 1108.73, time: 1.05, dur: 0.4 },
      { freq: 830.61, time: 1.5, dur: 0.18 },
      { freq: 987.77, time: 1.7, dur: 0.18 },
      { freq: 1318.51, time: 1.95, dur: 0.5 },
    ],
  },
  {
    id: 'wahou_2',
    name: 'Marimba Solaire',
    style: 'Tropical',
    description: 'Accords chauds et joyeux style marimba',
    wave: 'sine',
    cycleMs: 2400,
    notes: [
      { freq: 523.25, time: 0, dur: 0.14 },
      { freq: 659.25, time: 0.14, dur: 0.14 },
      { freq: 783.99, time: 0.28, dur: 0.18 },
      { freq: 1046.5, time: 0.48, dur: 0.28 },
      { freq: 880.0, time: 0.82, dur: 0.16 },
      { freq: 783.99, time: 1.02, dur: 0.16 },
      { freq: 659.25, time: 1.22, dur: 0.2 },
      { freq: 1046.5, time: 1.5, dur: 0.45 },
    ],
  },
  {
    id: 'wahou_3',
    name: 'Kalimba Kinshasa',
    style: 'Afro Mélodie',
    description: 'Rythme doux et percussif inspiré du kalimba',
    wave: 'sine',
    cycleMs: 2200,
    notes: [
      { freq: 587.33, time: 0, dur: 0.15 },
      { freq: 739.99, time: 0.16, dur: 0.15 },
      { freq: 880.0, time: 0.32, dur: 0.15 },
      { freq: 1174.66, time: 0.48, dur: 0.22 },
      { freq: 987.77, time: 0.74, dur: 0.16 },
      { freq: 880.0, time: 0.94, dur: 0.16 },
      { freq: 739.99, time: 1.14, dur: 0.18 },
      { freq: 587.33, time: 1.38, dur: 0.35 },
    ],
  },
  {
    id: 'wahou_4',
    name: 'Éclat de Cristal',
    style: 'Haute Définition',
    description: 'Arpège scintillant pur et lumineux',
    wave: 'sine',
    cycleMs: 2500,
    notes: [
      { freq: 1046.5, time: 0, dur: 0.12 },
      { freq: 1318.51, time: 0.12, dur: 0.12 },
      { freq: 1567.98, time: 0.24, dur: 0.14 },
      { freq: 2093.0, time: 0.4, dur: 0.35 },
      { freq: 1567.98, time: 0.85, dur: 0.14 },
      { freq: 1318.51, time: 1.02, dur: 0.14 },
      { freq: 1760.0, time: 1.22, dur: 0.22 },
      { freq: 2093.0, time: 1.52, dur: 0.5 },
    ],
  },
  {
    id: 'wahou_5',
    name: 'Vague Océane',
    style: 'Douce & Zen',
    description: 'Harmonie apaisante en vagues montantes',
    wave: 'sine',
    cycleMs: 3000,
    notes: [
      { freq: 440.0, time: 0, dur: 0.35, vol: 0.15 },
      { freq: 554.37, time: 0.35, dur: 0.35, vol: 0.16 },
      { freq: 659.25, time: 0.7, dur: 0.4, vol: 0.18 },
      { freq: 880.0, time: 1.15, dur: 0.65, vol: 0.2 },
      { freq: 659.25, time: 1.9, dur: 0.45, vol: 0.14 },
    ],
  },
  {
    id: 'wahou_6',
    name: 'Pulse Électro',
    style: 'Dynamique',
    description: 'Cadence moderne électro très audible',
    wave: 'sawtooth',
    cycleMs: 2000,
    notes: [
      { freq: 493.88, time: 0, dur: 0.1, vol: 0.1 },
      { freq: 493.88, time: 0.15, dur: 0.1, vol: 0.1 },
      { freq: 739.99, time: 0.32, dur: 0.14, vol: 0.12 },
      { freq: 987.77, time: 0.5, dur: 0.2, vol: 0.13 },
      { freq: 880.0, time: 0.82, dur: 0.12, vol: 0.11 },
      { freq: 987.77, time: 1.0, dur: 0.28, vol: 0.13 },
    ],
  },
  {
    id: 'wahou_7',
    name: 'Aurore Dorée',
    style: 'Piano Doux',
    description: 'Séquence piano électrique chaleureuse',
    wave: 'triangle',
    cycleMs: 2700,
    notes: [
      { freq: 523.25, time: 0, dur: 0.25 },
      { freq: 659.25, time: 0.26, dur: 0.25 },
      { freq: 783.99, time: 0.52, dur: 0.25 },
      { freq: 987.77, time: 0.78, dur: 0.45 },
      { freq: 880.0, time: 1.32, dur: 0.28 },
      { freq: 783.99, time: 1.65, dur: 0.45 },
    ],
  },
  {
    id: 'wahou_8',
    name: 'Sonnerie Classique Pro',
    style: 'Téléphone Pro',
    description: 'Double sonnerie claire et professionnelle',
    wave: 'sine',
    cycleMs: 2400,
    notes: [
      { freq: 932.33, time: 0, dur: 0.09, vol: 0.2 },
      { freq: 1174.66, time: 0.09, dur: 0.09, vol: 0.2 },
      { freq: 932.33, time: 0.18, dur: 0.09, vol: 0.2 },
      { freq: 1174.66, time: 0.27, dur: 0.12, vol: 0.2 },
      { freq: 932.33, time: 0.65, dur: 0.09, vol: 0.2 },
      { freq: 1174.66, time: 0.74, dur: 0.09, vol: 0.2 },
      { freq: 932.33, time: 0.83, dur: 0.09, vol: 0.2 },
      { freq: 1174.66, time: 0.92, dur: 0.18, vol: 0.2 },
    ],
  },
  {
    id: 'wahou_9',
    name: 'Rythme Rumba',
    style: 'Festif',
    description: 'Mélodie joyeuse et dansante style rumba',
    wave: 'triangle',
    cycleMs: 2200,
    notes: [
      { freq: 659.25, time: 0, dur: 0.14 },
      { freq: 783.99, time: 0.15, dur: 0.14 },
      { freq: 880.0, time: 0.3, dur: 0.18 },
      { freq: 783.99, time: 0.52, dur: 0.14 },
      { freq: 1046.5, time: 0.7, dur: 0.22 },
      { freq: 880.0, time: 0.98, dur: 0.14 },
      { freq: 783.99, time: 1.15, dur: 0.14 },
      { freq: 659.25, time: 1.32, dur: 0.35 },
    ],
  },
  {
    id: 'wahou_10',
    name: 'Étoile Spatiale',
    style: 'Futuriste',
    description: 'Séquence harmonique brillante et cosmique',
    wave: 'sine',
    cycleMs: 2600,
    notes: [
      { freq: 783.99, time: 0, dur: 0.16 },
      { freq: 1174.66, time: 0.18, dur: 0.16 },
      { freq: 1567.98, time: 0.36, dur: 0.2 },
      { freq: 1396.91, time: 0.62, dur: 0.2 },
      { freq: 1760.0, time: 0.88, dur: 0.32 },
      { freq: 1567.98, time: 1.28, dur: 0.55 },
    ],
  },
];

function startPresetRingtoneLoop(preset: RingtonePreset, loop: boolean = true): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const playCycle = () => {
    if (!isPlaying) return;
    try {
      const now = ctx.currentTime;
      preset.notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const peakVol = note.vol ?? 0.18;

        osc.type = preset.wave;
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.001, now + note.time);
        gain.gain.linearRampToValueAtTime(peakVol, now + note.time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur + 0.05);
      });
    } catch {}

    if (loop && isPlaying) {
      timerId = setTimeout(playCycle, preset.cycleMs);
    }
  };

  playCycle();

  return () => {
    isPlaying = false;
    if (timerId) clearTimeout(timerId);
  };
}

/**
 * Joue une sonnerie spécifique (pré-enregistrée parmi les 10 de my Wahou OU fichier musical du téléphone)
 */
export function startSelectedRingtone(
  ringtoneId?: string,
  userId?: string,
  loop: boolean = true,
  onEnded?: () => void
): () => void {
  let stopped = false;
  let innerStop: (() => void) | null = null;
  let audioEl: HTMLAudioElement | null = null;
  let objectUrlToRevoke: string | null = null;

  const cleanup = () => {
    stopped = true;
    if (innerStop) {
      innerStop();
      innerStop = null;
    }
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.src = '';
      } catch {}
      audioEl = null;
    }
    if (objectUrlToRevoke) {
      try {
        URL.revokeObjectURL(objectUrlToRevoke);
      } catch {}
      objectUrlToRevoke = null;
    }
  };

  if (ringtoneId === 'custom_file' && userId) {
    getCustomRingtoneObjectUrl(userId).then((custom) => {
      if (stopped) {
        if (custom?.url) URL.revokeObjectURL(custom.url);
        return;
      }
      if (custom?.url) {
        objectUrlToRevoke = custom.url;
        audioEl = new Audio(custom.url);
        audioEl.loop = loop;
        audioEl.volume = 0.85;
        if (onEnded && !loop) {
          audioEl.onended = onEnded;
        }
        audioEl.play().catch(() => {
          // Autoplay blocked fallback to built-in tone
          if (!stopped) {
            innerStop = startPresetRingtoneLoop(MY_WAHOU_RINGTONES[0], loop);
          }
        });
      } else {
        innerStop = startPresetRingtoneLoop(MY_WAHOU_RINGTONES[0], loop);
      }
    }).catch(() => {
      if (!stopped) {
        innerStop = startPresetRingtoneLoop(MY_WAHOU_RINGTONES[0], loop);
      }
    });
    return cleanup;
  }

  const preset =
    MY_WAHOU_RINGTONES.find((r) => r.id === ringtoneId) || MY_WAHOU_RINGTONES[0];
  innerStop = startPresetRingtoneLoop(preset, loop);

  if (!loop && onEnded) {
    const endTimer = setTimeout(() => {
      if (!stopped) onEnded();
    }, preset.cycleMs);
    return () => {
      clearTimeout(endTimer);
      cleanup();
    };
  }

  return cleanup;
}

/**
 * Sonnerie d'appel entrant personnalisée (utilise la sonnerie choisie par l'utilisateur)
 */
export function startIncomingCallMelodicRingtone(ringtoneId?: string, userId?: string): () => void {
  if (!ringtoneId && userId && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`mywahou_ringtone_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.ringtoneId) {
          return startSelectedRingtone(parsed.ringtoneId, userId, true);
        }
      }
    } catch {}
  }
  return startSelectedRingtone(ringtoneId || 'wahou_1', userId, true);
}

/**
 * Son de connexion d'appel réussi (Carillon montant)
 */
export function playCallConnectedTone() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startT = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.15, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startT);
      osc.stop(startT + 0.3);
    });
  } catch (e) {}
}

/**
 * Son de fin d'appel / raccrochage
 */
export function playCallEndedTone() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.2);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  } catch (e) {}
}

/**
 * Demande de permission pour les notifications de navigateur & Service Worker
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Could not request notification permission:', err);
    return 'denied';
  }
}

/**
 * Déclenche une notification système via Service Worker (fonctionne sur Android Chrome, iOS PWA, Bureau, et en arrière-plan / hors session)
 */
export function showBrowserNotification(
  title: string,
  body: string,
  iconUrl?: string,
  onClick?: () => void,
  tag: string = 'mywahou-message'
) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
  } catch {
    return;
  }

  const finalIcon = iconUrl || '/bird-logo.png';

  // Priorité 1: Notification via Service Worker actif (fiable même app minimisée ou sur Android)
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker) {
      navigator.serviceWorker.ready
        .then((registration) => {
          if (registration && typeof registration.showNotification === 'function') {
            return registration.showNotification(title, {
              body,
              icon: finalIcon,
              badge: '/icon-192.png',
              tag,
              renotify: true,
              silent: false,
              data: { url: '/' },
            } as NotificationOptions);
          }
          throw new Error('No SW showNotification');
        })
        .catch(() => {
          // Fallback standard Notification API
          try {
            const notification = new Notification(title, {
              body,
              icon: finalIcon,
              badge: '/icon-192.png',
              tag,
              silent: false,
            });
            if (onClick) {
              notification.onclick = () => {
                window.focus();
                onClick();
                notification.close();
              };
            }
            setTimeout(() => {
              try {
                notification.close();
              } catch {}
            }, 6000);
          } catch {}
        });
      return;
    }
  } catch {}

  try {
    const notification = new Notification(title, {
      body,
      icon: finalIcon,
      badge: '/icon-192.png',
      tag,
      silent: false,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    setTimeout(() => {
      try {
        notification.close();
      } catch {}
    }, 6000);
  } catch (err) {
    console.warn('Error displaying system notification:', err);
  }
}
