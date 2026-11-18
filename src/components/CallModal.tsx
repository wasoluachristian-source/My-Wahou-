import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  SwitchCamera,
  Maximize2,
  Minimize2,
  Sparkles,
  PhoneCall,
  XCircle
} from 'lucide-react';
import { UserProfile, ChatMessage, CallSession } from '../types';
import {
  updateUserInDb,
  sendMessageToDb,
  getContactDisplayName,
  updateCallSessionInDb,
  subscribeCallSession,
  addCallCandidateInDb,
  subscribeCallCandidates
} from '../services/dbService';
import {
  startOutgoingRingtone,
  playCallConnectedTone,
  playCallEndedTone
} from '../utils/soundUtils';
import { UserAvatar } from './UserAvatar';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: UserProfile;
  currentUser: UserProfile;
  isVideoCall: boolean;
  onOpenForfaitModal: () => void;
  conversationId: string;
  callSessionId?: string;
  callRole?: 'caller' | 'receiver';
  existingSession?: CallSession | null;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CallModal({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  isVideoCall: initialIsVideo,
  conversationId,
  callSessionId,
  callRole = 'caller',
  existingSession,
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'declined' | 'ended'>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(initialIsVideo);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasMediaError, setHasMediaError] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const ringtoneStopRef = useRef<(() => void) | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const connectedStartedRef = useRef(false);
  const remoteDescSetRef = useRef(false);
  const answerSentRef = useRef(false);
  const isClosingRef = useRef(false);
  const durationRef = useRef(0);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const [waveHeight, setWaveHeight] = useState([35, 65, 45, 85, 55, 75, 95, 50, 70, 40]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Attach remote stream tracks to media elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = !isSpeakerOn;
    }
  }, [remoteStream, isSpeakerOn, callStatus]);

  useEffect(() => {
    if (localVideoRef.current && cameraStream) {
      localVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isVideoActive]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const contactName = getContactDisplayName(targetUser, null, targetUser?.id, currentUser.id);

  const cleanupMediaAndPc = () => {
    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setCameraStream(null);
    setRemoteStream(null);
  };

  const startConnectedPhase = () => {
    if (connectedStartedRef.current) return;
    connectedStartedRef.current = true;

    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
    playCallConnectedTone();
    setCallStatus('connected');

    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      setDuration(secs);
      setWaveHeight((prev) => prev.map(() => Math.floor(Math.random() * 75) + 25));
    }, 1000);
  };

  useEffect(() => {
    if (!isOpen) return;

    // Reset refs and UI state
    connectedStartedRef.current = false;
    remoteDescSetRef.current = false;
    answerSentRef.current = false;
    isClosingRef.current = false;
    pendingCandidatesRef.current = [];
    setCallStatus(callRole === 'receiver' ? 'connected' : 'ringing');
    setDuration(0);
    setIsMuted(false);
    setIsVideoActive(initialIsVideo);
    setHasMediaError(false);

    // Ensure starter call minutes exist if non-VIP
    if (!currentUser.isVIP && (currentUser.callMinutes || 0) <= 0) {
      updateUserInDb(currentUser.id, { callMinutes: 15 }).catch(() => {});
    }

    // If caller, start outgoing ringtone while waiting for recipient acceptance
    if (callRole === 'caller') {
      try {
        ringtoneStopRef.current = startOutgoingRingtone();
      } catch (e) {
        console.warn('Could not start ringtone:', e);
      }
    } else {
      // Receiver already clicked Accept!
      startConnectedPhase();
    }

    let isCancelled = false;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    const remoteMedia = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteMedia.addTrack(track);
      });
      if (!event.streams[0] && event.track) {
        remoteMedia.addTrack(event.track);
      }
      setRemoteStream(new MediaStream(remoteMedia.getTracks()));
    };

    if (callSessionId) {
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addCallCandidateInDb(callSessionId, callRole, event.candidate.toJSON());
        }
      };
    }

    const setupMediaAndNegotiation = async () => {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: initialIsVideo ? { facingMode: 'user' } : false,
            audio: true,
          });
          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
          setCameraStream(stream);
          if (localVideoRef.current && initialIsVideo) {
            localVideoRef.current.srcObject = stream;
          }
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        } catch (err) {
          console.warn('Camera/Mic permission restricted:', err);
          setHasMediaError(true);
        }
      }

      if (!callSessionId || isCancelled) return;

      // Caller creates SDP Offer and publishes it to Firestore call document
      if (callRole === 'caller') {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: initialIsVideo,
          });
          await pc.setLocalDescription(offer);
          await updateCallSessionInDb(callSessionId, {
            offer: { type: offer.type, sdp: offer.sdp },
          });
        } catch (err) {
          console.warn('Error creating WebRTC offer:', err);
        }
      } else if (callRole === 'receiver' && existingSession?.offer?.sdp && !answerSentRef.current) {
        // Receiver applies Caller Offer and sends SDP Answer
        try {
          answerSentRef.current = true;
          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: existingSession.offer.type as RTCSdpType,
              sdp: existingSession.offer.sdp,
            })
          );
          remoteDescSetRef.current = true;

          // Flush queued ICE candidates
          for (const cand of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingCandidatesRef.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateCallSessionInDb(callSessionId, {
            status: 'connected',
            answer: { type: answer.type, sdp: answer.sdp },
          });
        } catch (err) {
          console.warn('Error creating WebRTC answer:', err);
        }
      }
    };

    setupMediaAndNegotiation();

    // Subscribe to Firestore Call Session updates (Acceptance, Decline, Answer SDP, Hangup)
    let unsubSession = () => {};
    let unsubCandidates = () => {};

    if (callSessionId) {
      unsubSession = subscribeCallSession(callSessionId, async (session) => {
        if (!session || isCancelled) return;

        // Caller waiting for Recipient acceptance -> ONLY connect when status becomes 'connected'
        if (session.status === 'connected') {
          startConnectedPhase();

          // If caller receives SDP answer
          if (
            callRole === 'caller' &&
            session.answer?.sdp &&
            !remoteDescSetRef.current &&
            pcRef.current
          ) {
            try {
              remoteDescSetRef.current = true;
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription({
                  type: session.answer.type as RTCSdpType,
                  sdp: session.answer.sdp,
                })
              );
              for (const cand of pendingCandidatesRef.current) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
              pendingCandidatesRef.current = [];
            } catch (err) {
              console.warn('Error setting caller remote answer:', err);
            }
          }

          // If receiver was opened before offer arrived
          if (
            callRole === 'receiver' &&
            session.offer?.sdp &&
            !answerSentRef.current &&
            pcRef.current
          ) {
            try {
              answerSentRef.current = true;
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription({
                  type: session.offer.type as RTCSdpType,
                  sdp: session.offer.sdp,
                })
              );
              remoteDescSetRef.current = true;
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              await updateCallSessionInDb(callSessionId, {
                answer: { type: answer.type, sdp: answer.sdp },
              });
            } catch (err) {
              console.warn('Error answering delayed offer:', err);
            }
          }
        } else if (session.status === 'declined') {
          if (!isClosingRef.current) {
            isClosingRef.current = true;
            setCallStatus('declined');
            cleanupMediaAndPc();
            playCallEndedTone();
            setTimeout(() => {
              onClose();
            }, 1800);
          }
        } else if (session.status === 'ended') {
          if (!isClosingRef.current) {
            isClosingRef.current = true;
            setCallStatus('ended');
            cleanupMediaAndPc();
            playCallEndedTone();
            setTimeout(() => {
              onClose();
            }, 600);
          }
        }
      });

      const peerRole = callRole === 'caller' ? 'receiver' : 'caller';
      unsubCandidates = subscribeCallCandidates(callSessionId, peerRole, async (candidate) => {
        if (!pcRef.current) return;
        if (remoteDescSetRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      });
    }

    return () => {
      isCancelled = true;
      unsubSession();
      unsubCandidates();
      cleanupMediaAndPc();
    };
  }, [isOpen, initialIsVideo, callSessionId, callRole]);

  // Toggle Microphone (Mute / Unmute)
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Toggle Video (Camera On / Off)
  const toggleVideo = async () => {
    if (isVideoActive) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setIsVideoActive(false);
    } else {
      if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
        setIsVideoActive(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
        localStreamRef.current = stream;
        setCameraStream(stream);
        if (pcRef.current) {
          stream.getTracks().forEach((track) => {
            pcRef.current?.addTrack(track, stream);
          });
        }
        setIsVideoActive(true);
        setHasMediaError(false);
      } catch (err) {
        console.warn('Cannot enable camera:', err);
        setHasMediaError(true);
        setIsVideoActive(true);
      }
    }
  };

  // Flip Camera (Front / Back facingMode)
  const flipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    if (isVideoActive && localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: true,
        });
        localStreamRef.current = newStream;
        setCameraStream(newStream);
      } catch (e) {
        console.warn('Camera flip failed:', e);
      }
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // End Call handler
  const handleEndCall = async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const finalDuration = durationRef.current;
    const wasConnected = connectedStartedRef.current;

    setCallStatus('ended');
    cleanupMediaAndPc();
    playCallEndedTone();

    if (callSessionId) {
      await updateCallSessionInDb(callSessionId, {
        status: 'ended',
        endedAt: Date.now(),
        durationSeconds: finalDuration,
      });
    }

    // Deduct minutes if not VIP and call actually connected & lasted
    if (!currentUser.isVIP && wasConnected && finalDuration > 0) {
      const minutesUsed = Math.max(1, Math.ceil(finalDuration / 60));
      const remaining = Math.max(0, (currentUser.callMinutes || 15) - minutesUsed);
      await updateUserInDb(currentUser.id, { callMinutes: remaining }).catch(() => {});
    }

    // Log call in conversation
    if (conversationId && callRole === 'caller') {
      const logMessage: ChatMessage = {
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatarUrl,
        type: 'call_log',
        content: wasConnected
          ? `${isVideoActive ? 'Appel vidéo HD' : 'Appel vocal HD'} terminé (${formatDuration(finalDuration)})`
          : `${isVideoActive ? 'Appel vidéo HD' : 'Appel vocal HD'} annulé (sans réponse)`,
        timestamp: Date.now(),
        isDelivered: true,
        isRead: true,
        callInfo: {
          type: isVideoActive ? 'video' : 'audio',
          duration: finalDuration,
          status: wasConnected ? 'completed' : 'missed',
        },
      };
      await sendMessageToDb(logMessage, targetUser?.id).catch(() => {});
    }

    setTimeout(() => {
      onClose();
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <div
      id="call-modal-backdrop"
      ref={modalRef}
      className="fixed inset-0 z-[99990] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-2xl animate-fade-in select-none"
    >
      {/* Hidden Remote Audio Element for reliable audio output */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div
        id="call-container"
        className="relative w-full max-w-xl bg-zinc-950 border border-violet-500/30 rounded-3xl sm:rounded-[36px] p-5 sm:p-8 text-white shadow-2xl flex flex-col items-center justify-between min-h-[560px] sm:min-h-[620px] overflow-hidden"
      >
        {/* Ambient Neon Atmosphere (Palette my Wahou) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Status Header */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-600 text-white shadow-md shadow-violet-600/30">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-violet-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                my Wahou {isVideoActive ? 'Vidéo HD' : 'Vocal HD'}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Chiffré • Acceptation obligatoire</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
              title="Plein écran"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <div className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono font-bold text-cyan-300 flex items-center gap-2 shadow-inner">
              <span
                className={`w-2 h-2 rounded-full ${
                  callStatus === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : callStatus === 'declined'
                    ? 'bg-red-500'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span>
                {callStatus === 'ringing'
                  ? 'En attente...'
                  : callStatus === 'declined'
                  ? 'Refusé'
                  : formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Center Main Stage (Video Feed OR Audio Calling Screen) */}
        <div className="relative my-auto flex flex-col items-center justify-center text-center z-10 w-full px-2">
          {callStatus === 'declined' ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <XCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white">Appel refusé</h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                {contactName} n'a pas accepté l'appel pour le moment.
              </p>
            </div>
          ) : isVideoActive ? (
            /* VIDEO CALL SCREEN */
            <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden bg-zinc-900 border-2 border-violet-500/40 shadow-2xl shadow-violet-600/20">
              {/* Remote Video Stream when connected and received, else target avatar stage */}
              {callStatus === 'connected' && remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-violet-950/60 to-zinc-900 flex flex-col items-center justify-center p-6 text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600 to-pink-600 blur-xl opacity-60 animate-pulse" />
                    <UserAvatar
                      name={contactName}
                      avatarUrl={targetUser.avatarUrl}
                      size="xl"
                      className="relative border-4 border-violet-400 ring-4 ring-pink-500/40 shadow-2xl"
                    />
                  </div>
                  <h4 className="text-lg font-black text-white">{contactName}</h4>
                  <p className="text-xs text-violet-300 font-medium mt-1">
                    {callStatus === 'ringing'
                      ? "En attente que le destinataire accepte l'appel vidéo..."
                      : 'Appel vidéo HD connecté • Communication en direct'}
                  </p>
                </div>
              )}

              {/* Local Picture-in-Picture Camera Preview */}
              {!hasMediaError && cameraStream && (
                <div className="absolute bottom-14 right-3 w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Target contact floating badge on top right */}
              <div className="absolute top-3 right-3 flex items-center gap-2 p-1.5 pr-3.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-violet-500/40 shadow-lg">
                <UserAvatar name={contactName} avatarUrl={targetUser.avatarUrl} size="xs" />
                <span className="text-xs font-bold text-white truncate max-w-[120px]">
                  {contactName}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    callStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                  }`}
                />
              </div>

              {/* Status footer inside video */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-zinc-300">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Vidéo HD 1080p
                </span>
                <span className="font-mono text-zinc-300">
                  {callStatus === 'ringing' ? 'Sonnerie en cours...' : formatDuration(duration)}
                </span>
              </div>
            </div>
          ) : (
            /* AUDIO CALL SCREEN */
            <>
              <div className="relative mb-5 sm:mb-6">
                <div
                  className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
                    callStatus === 'connected'
                      ? 'bg-gradient-to-tr from-violet-600 via-pink-500 to-cyan-400 opacity-60 animate-pulse'
                      : 'bg-pink-600/40 animate-ping'
                  }`}
                />
                <div className="relative p-1 rounded-full bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-400 shadow-2xl">
                  <UserAvatar
                    name={contactName}
                    avatarUrl={targetUser.avatarUrl}
                    size="xl"
                    className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-zinc-950 shadow-2xl"
                  />
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
                {contactName}
              </h3>

              {targetUser.profileTag && (
                <div className="mb-2">
                  <span className="font-mono text-xs font-bold text-violet-300 bg-violet-950/80 px-2.5 py-0.5 rounded-lg border border-violet-500/40">
                    {targetUser.profileTag}
                  </span>
                </div>
              )}

              <p className="text-xs text-zinc-400 mb-4 max-w-xs truncate">
                {targetUser.email || 'Membre vérifié my Wahou'}
              </p>

              {callStatus === 'connected' ? (
                <div className="flex items-center justify-center gap-1.5 h-12 px-6 py-2 rounded-full bg-zinc-900/90 border border-violet-500/30 shadow-lg shadow-violet-950/50">
                  {waveHeight.map((h, idx) => (
                    <span
                      key={idx}
                      style={{ height: `${h}%` }}
                      className="w-1 sm:w-1.5 bg-gradient-to-t from-violet-500 via-pink-500 to-cyan-400 rounded-full transition-all duration-200"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-violet-300 animate-pulse font-semibold">
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  <span>Sonnerie en cours • En attente d'acceptation...</span>
                </div>
              )}
            </>
          )}

          {/* Status subtext */}
          {callStatus !== 'declined' && (
            <p className="text-xs text-zinc-400 mt-4 font-medium flex items-center gap-1.5">
              {callStatus === 'ringing' ? (
                <span>🔊 Le destinataire doit accepter l'appel pour démarrer la discussion</span>
              ) : (
                <span className="text-emerald-400 font-semibold">
                  ✓ Appel accepté • Audio & Vidéo HD actifs
                </span>
              )}
            </p>
          )}
        </div>

        {/* Call In-Call Controls Bar */}
        <div className="w-full flex items-center justify-center gap-3 sm:gap-5 z-10 pt-4 border-t border-zinc-800/90">
          <button
            id="call-mute-toggle-btn"
            onClick={toggleMute}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center transition active:scale-95 shadow-lg ${
              isMuted
                ? 'bg-red-600 text-white shadow-red-600/40'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
            title={isMuted ? 'Activer le micro' : 'Couper le micro (Mute)'}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          <button
            id="call-video-toggle-btn"
            onClick={toggleVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center transition active:scale-95 shadow-lg ${
              isVideoActive
                ? 'bg-gradient-to-tr from-violet-600 to-pink-600 text-white shadow-violet-600/40'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
            title={isVideoActive ? 'Désactiver la caméra' : 'Activer la caméra'}
          >
            {isVideoActive ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {isVideoActive && (
            <button
              id="call-flip-camera-btn"
              onClick={flipCamera}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center justify-center transition active:scale-95 shadow-lg"
              title="Changer de caméra (Avant / Arrière)"
            >
              <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
            </button>
          )}

          <button
            id="call-speaker-toggle-btn"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center transition active:scale-95 shadow-lg ${
              isSpeakerOn
                ? 'bg-zinc-900 text-cyan-300 border border-cyan-500/40'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
            }`}
            title={isSpeakerOn ? 'Haut-parleur actif' : 'Haut-parleur désactivé'}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          <button
            id="end-call-btn"
            onClick={handleEndCall}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition transform active:scale-90 hover:scale-105"
            title="Raccrocher l'appel"
          >
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
