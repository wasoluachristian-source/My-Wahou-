/**
 * Sound & Notification Utilities for my Wahou
 * Synthesizes crisp, native-feeling audio clicks/pops with Web Audio API
 * and handles WhatsApp-style push notifications & browser notifications.
 */

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
 * Demande de permission pour les notifications de navigateur
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Could not request notification permission:', err);
    return 'denied';
  }
}

/**
 * Déclenche une notification système de bureau/mobile quand l'application est en arrière-plan
 */
export function showBrowserNotification(
  title: string,
  body: string,
  iconUrl?: string,
  onClick?: () => void
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: iconUrl || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'mywahou-message',
      silent: false, // Allows native sound
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // Auto-close after 6 seconds
    setTimeout(() => {
      try {
        notification.close();
      } catch {}
    }, 6000);
  } catch (err) {
    console.warn('Error displaying system notification:', err);
  }
}
