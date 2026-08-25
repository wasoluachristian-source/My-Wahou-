import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, ShieldCheck, Zap } from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';
import { updateUserInDb, sendMessageToDb } from '../services/dbService';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserProfile;
  currentUser: UserProfile;
  isVideoCall: boolean;
  onOpenForfaitModal: () => void;
  conversationId: string;
}

export function CallModal({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  isVideoCall: initialIsVideo,
  onOpenForfaitModal,
  conversationId,
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(initialIsVideo);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [waveHeight, setWaveHeight] = useState([30, 60, 40, 80, 50, 70, 90, 45]);

  useEffect(() => {
    if (!isOpen) return;

    // Check call minutes
    if (!currentUser.isVIP && (currentUser.callMinutes || 0) <= 0) {
      alert("Votre solde d'appels est épuisé. Veuillez recharger votre forfait pour appeler.");
      onClose();
      onOpenForfaitModal();
      return;
    }

    setCallStatus('ringing');
    setDuration(0);
    setIsVideoActive(initialIsVideo);

    // If video call requested, try opening webcam
    if (initialIsVideo) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setCameraStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Webcam not allowed or unavailable:', err);
        });
    }

    // Simulate connection after 2 seconds
    const ringTimer = setTimeout(() => {
      setCallStatus('connected');

      // Start duration counter
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - start) / 1000);
        setDuration(secs);

        // Animate fake audio waveform
        setWaveHeight(prev => prev.map(() => Math.floor(Math.random() * 80) + 20));
      }, 1000);
    }, 2000);

    return () => {
      clearTimeout(ringTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen, initialIsVideo]);

  // Clean up camera on stream toggle
  const toggleVideo = async () => {
    if (isVideoActive) {
      if (cameraStream) {
        cameraStream.getVideoTracks().forEach(t => t.stop());
      }
      setIsVideoActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setCameraStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsVideoActive(true);
      } catch (err) {
        console.error('Camera toggle error:', err);
      }
    }
  };

  const handleEndCall = async () => {
    setCallStatus('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }

    // Deduct minutes if not VIP
    const minutesUsed = Math.max(1, Math.ceil(duration / 60));
    if (!currentUser.isVIP && duration > 0) {
      const remainingMinutes = Math.max(0, (currentUser.callMinutes || 0) - minutesUsed);
      await updateUserInDb(currentUser.id, { callMinutes: remainingMinutes });
    }

    // Log call in conversation
    if (conversationId) {
      const logMessage: ChatMessage = {
        id: `call_${Date.now()}`,
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatarUrl,
        type: 'call_log',
        content: `${isVideoActive ? 'Appel vidéo' : 'Appel vocal'} terminé (${formatDuration(duration)})`,
        timestamp: Date.now(),
        isDelivered: true,
        isRead: true,
        callInfo: {
          type: isVideoActive ? 'video' : 'audio',
          duration,
          status: 'completed',
        },
      };
      await sendMessageToDb(logMessage);
    }

    setTimeout(() => {
      onClose();
    }, 600);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="call-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in"
    >
      <div
        id="call-container"
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col items-center justify-between min-h-[520px] overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-pink-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-violet-500/20 text-violet-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
              my Wahou Call HD
            </span>
          </div>
          <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {callStatus === 'ringing' ? 'Sonnerie...' : formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Center Target & Media Feed */}
        <div className="relative my-auto flex flex-col items-center justify-center text-center z-10 w-full">
          {isVideoActive ? (
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl mb-4">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Target avatar thumbnail floating */}
              <div className="absolute top-3 right-3 flex items-center gap-2 p-1.5 pr-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <img
                  src={targetUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={targetUser.displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-xs font-medium text-white">{targetUser.displayName}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Target Avatar with pulse aura */}
              <div className="relative mb-6">
                <div className={`absolute inset-0 rounded-full blur-2xl ${callStatus === 'connected' ? 'bg-violet-600/50 animate-pulse' : 'bg-pink-600/40 animate-ping'}`} />
                <img
                  src={targetUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                  alt={targetUser.displayName}
                  className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-violet-500 shadow-2xl"
                />
              </div>

              <h3 className="text-2xl font-black text-white mb-1">
                {targetUser.displayName}
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                {targetUser.email}
              </p>

              {/* Live Spectrum visualizer when connected */}
              {callStatus === 'connected' && (
                <div className="flex items-center justify-center gap-1.5 h-10 px-6 py-2 rounded-full bg-zinc-900/80 border border-zinc-800">
                  {waveHeight.map((h, idx) => (
                    <span
                      key={idx}
                      style={{ height: `${h}%` }}
                      className="w-1 bg-gradient-to-t from-violet-500 to-pink-400 rounded-full transition-all duration-150"
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Status tagline */}
          <p className="text-xs text-zinc-500 mt-3 font-medium">
            {callStatus === 'ringing' ? 'Appel sécurisé en attente de réponse...' : 'Connexion chiffrée de bout en bout'}
          </p>
        </div>

        {/* Controls Bar */}
        <div className="w-full flex items-center justify-center gap-4 sm:gap-6 z-10 pt-4 border-t border-zinc-800/80">
          {/* Mute toggle */}
          <button
            id="call-mute-toggle-btn"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition active:scale-90 shadow-lg ${
              isMuted
                ? 'bg-red-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
            title={isMuted ? 'Activer micro' : 'Couper micro'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            id="end-call-btn"
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transition transform active:scale-95 animate-pulse"
            title="Raccrocher"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Video toggle */}
          <button
            id="call-video-toggle-btn"
            onClick={toggleVideo}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition active:scale-90 shadow-lg ${
              isVideoActive
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
            title={isVideoActive ? 'Désactiver caméra' : 'Activer caméra'}
          >
            {isVideoActive ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
