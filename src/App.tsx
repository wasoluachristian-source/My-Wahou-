import { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  ChatMessage,
  Conversation,
  AppSettings,
  CallSession
} from './types';
import {
  DEFAULT_APP_SETTINGS,
  subscribeAppSettings,
  subscribeAllUsers,
  subscribeUserConversations,
  subscribeMessages,
  createOrGetDirectConversation,
  updateUserPresenceInDb,
  sendMessageToDb,
  createCallSessionInDb,
  updateCallSessionInDb,
  subscribeIncomingCalls,
  INITIAL_USERS,
  ADMIN_EMAIL,
  isUserAdmin
} from './services/dbService';

import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { JourneeLiveView } from './components/JourneeLiveView';
import { ProfileView, ProfileSubTab } from './components/ProfileView';
import { MobileAppView } from './components/MobileAppView';
import { LisangaView } from './components/LisangaView';
import { NavigationRail, AppSpace } from './components/NavigationRail';
import { AuthModal } from './components/AuthModal';
import { ForfaitModal } from './components/ForfaitModal';
import { CallModal } from './components/CallModal';
import { AdminDashboard } from './components/AdminDashboard';
import { UserProfileModal } from './components/UserProfileModal';
import { NewChatModal } from './components/NewChatModal';
import { WebLinkModal } from './components/WebLinkModal';
import { SetPasswordModal } from './components/SetPasswordModal';
import { WhatsAppPushBanner, WhatsAppPushData } from './components/WhatsAppPushBanner';
import { FloatingChatBubble } from './components/FloatingChatBubble';
import { AppBackground } from './components/AppBackground';
import { SplashScreen } from './components/SplashScreen';
import { UserAvatar } from './components/UserAvatar';
import { BrandBirdLogo } from './components/BrandBirdLogo';
import { isPasswordConfigured } from './utils/securityUtils';
import {
  playNotificationChime,
  showBrowserNotification,
  requestPushNotificationPermission,
  startIncomingCallMelodicRingtone,
  playCallEndedTone,
} from './utils/soundUtils';
import {
  getUserRingtoneMeta,
  saveBackgroundNotifConfig,
  getBackgroundNotifConfigSync,
} from './utils/ringtoneStorage';

import { Shield, Share2, KeyRound, Phone, PhoneOff, Video } from 'lucide-react';

export default function App() {
  // App Global Settings (Logo, name, branding, announcement)
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  // 10-second Splash Screen ("my Wahou" / "développé par Wastus Spart 2026")
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Active space view state ('discussion' | 'lisanga' | 'live' | 'profil' | 'mobile_app')
  const [activeSpace, setActiveSpace] = useState<AppSpace>('discussion');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('profil');
  const [isInsideLisangaGroup, setIsInsideLisangaGroup] = useState(false);

  // Users and Auth State
  const [allUsers, setAllUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mywahou_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object' || !parsed.id) {
          return null;
        }
        if (!parsed.displayName) {
          parsed.displayName = 'Membre my Wahou';
        }
        if (
          parsed.id === 'admin_spart' ||
          parsed.id === 'user_aicha' ||
          parsed.id === 'user_malik' ||
          parsed.id === 'user_sophie' ||
          parsed.email?.toLowerCase() === 'spart@gmail.com' ||
          parsed.email?.includes('@wahou.app')
        ) {
          localStorage.removeItem('mywahou_user');
          return null;
        }

        if (parsed.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          parsed.role = 'admin';
          parsed.isVIP = true;
          parsed.mediaQuota = 9999;
          parsed.callMinutes = 9999;
        } else {
          parsed.role = 'user';
        }
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  });

  // Conversations and Messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTargetUser, setActiveTargetUser] = useState<UserProfile | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Last Active Contact for Floating Chat Bubble
  const [lastActiveContact, setLastActiveContact] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mywahou_last_contact');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // WhatsApp-style Top Push Banner State
  const [whatsappPushData, setWhatsappPushData] = useState<WhatsAppPushData | null>(null);
  const prevConversationsRef = useRef<Record<string, number>>({});
  const initialLoadRef = useRef<{ loaded: boolean }>({ loaded: false });

  // Modals & Call Signaling State
  const [isForfaitModalOpen, setIsForfaitModalOpen] = useState(false);
  const [forfaitModalType, setForfaitModalType] = useState<'media' | 'call' | 'vip'>('vip');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [activeCallRole, setActiveCallRole] = useState<'caller' | 'receiver'>('caller');
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const incomingRingStopRef = useRef<(() => void) | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isWebLinkModalOpen, setIsWebLinkModalOpen] = useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);

  // Mobile navigation view state ('sidebar' | 'chat')
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // Compute total unread messages count for visual notification badge
  const totalUnreadCount = conversations.reduce((acc, c) => {
    if (!currentUser?.id) return acc;
    return acc + (c.unreadCount?.[currentUser.id] || 0);
  }, 0);

  // True when user is inside a 1-on-1 discussion or an active Lisanga group chat
  const isInsideConversation =
    (activeSpace === 'discussion' && mobileView === 'chat' && Boolean(activeConversationId)) ||
    (activeSpace === 'lisanga' && isInsideLisangaGroup);

  // User online presence heartbeat & window listener
  useEffect(() => {
    if (!currentUser?.id) return;

    updateUserPresenceInDb(currentUser.id, true);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateUserPresenceInDb(currentUser.id, true);
      }
    }, 45000);

    const handleVisibility = () => {
      updateUserPresenceInDb(currentUser.id, document.visibilityState === 'visible');
    };

    const handleBeforeUnload = () => {
      updateUserPresenceInDb(currentUser.id, false);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id]);

  // Subscribe to Global App Settings from Firestore
  useEffect(() => {
    const unsub = subscribeAppSettings((settings) => {
      setAppSettings(settings);
    });
    return () => unsub();
  }, []);

  // Subscribe to All Users from Firestore
  useEffect(() => {
    const unsub = subscribeAllUsers((users) => {
      setAllUsers(users);

      if (currentUser) {
        const updatedSelf = users.find((u) => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
          try {
            localStorage.setItem('mywahou_user', JSON.stringify(updatedSelf));
          } catch {}
        }
      }
    });
    return () => unsub();
  }, [currentUser?.id]);

  // Subscribe to Incoming Audio/Video Calls requiring explicit recipient acceptance
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeIncomingCalls(currentUser.id, (calls) => {
      if (isCallModalOpen) return;
      if (calls.length > 0) {
        const latest = calls[0];
        setIncomingCall(latest);
        if (!incomingRingStopRef.current) {
          const activeRingtoneId =
            currentUser.ringtoneId || getUserRingtoneMeta(currentUser.id).ringtoneId;
          incomingRingStopRef.current = startIncomingCallMelodicRingtone(
            activeRingtoneId,
            currentUser.id
          );
          showBrowserNotification(
            `Appel entrant - ${appSettings.appName || 'my Wahou'}`,
            `${latest.callerName || 'Un contact'} vous appelle (${
              latest.isVideo || latest.type === 'video' ? 'Vidéo' : 'Audio'
            })`,
            latest.callerAvatar || '/bird-logo.png',
            undefined,
            `call-${latest.id}`
          );
        }
      } else {
        setIncomingCall(null);
        if (incomingRingStopRef.current) {
          incomingRingStopRef.current();
          incomingRingStopRef.current = null;
        }
      }
    });

    return () => {
      unsub();
      if (incomingRingStopRef.current) {
        incomingRingStopRef.current();
        incomingRingStopRef.current = null;
      }
    };
  }, [currentUser?.id, currentUser?.ringtoneId, isCallModalOpen, appSettings.appName]);

  // Subscribe to Conversations for Current User & Push Notification triggers
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserConversations(currentUser.id, (convos) => {
      setConversations(convos);

      if (initialLoadRef.current.loaded) {
        convos.forEach((c) => {
          const lastMsg = c.lastMessage;
          const prevTime = prevConversationsRef.current[c.id] || 0;
          if (
            lastMsg &&
            lastMsg.timestamp > prevTime &&
            lastMsg.senderName !== currentUser.displayName &&
            Date.now() - lastMsg.timestamp < 20000
          ) {
            const otherId = c.participantIds?.find((id) => id !== currentUser.id);
            const target = allUsers.find(
              (u) => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
            );

            playNotificationChime();

            showBrowserNotification(
              lastMsg.senderName,
              lastMsg.type === 'voice'
                ? '🎤 Note vocale reçue'
                : lastMsg.type === 'image'
                ? '🖼️ Photo reçue'
                : lastMsg.text || 'Nouveau message reçu',
              target?.avatarUrl || '/bird-logo.png'
            );

            if (activeSpace !== 'discussion' || activeConversationId !== c.id) {
              setWhatsappPushData({
                id: `push_${Date.now()}`,
                senderName: lastMsg.senderName,
                senderAvatar: target?.avatarUrl,
                senderTag: target?.profileTag,
                content: lastMsg.text || 'Nouveau message reçu',
                type: lastMsg.type || 'text',
                conversationId: c.id,
                targetUser: target,
                timestamp: lastMsg.timestamp,
              });
            }
          }
          if (lastMsg?.timestamp) {
            prevConversationsRef.current[c.id] = lastMsg.timestamp;
          }
        });
      } else {
        convos.forEach((c) => {
          if (c.lastMessage?.timestamp) {
            prevConversationsRef.current[c.id] = c.lastMessage.timestamp;
          }
        });
        initialLoadRef.current.loaded = true;
      }

      if (convos.length > 0) {
        if (!activeConversationId) {
          const first = convos[0];
          setActiveConversationId(first.id);
          const otherId = first.participantIds?.find((id) => id !== currentUser.id);
          const target = allUsers.find(
            (u) => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
          );
          setActiveTargetUser(target);
          if (target) {
            setLastActiveContact(target);
            try {
              localStorage.setItem('mywahou_last_contact', JSON.stringify(target));
            } catch {}
          }
        } else if (!activeTargetUser) {
          const current = convos.find((c) => c.id === activeConversationId);
          if (current) {
            const otherId = current.participantIds?.find((id) => id !== currentUser.id);
            const target = allUsers.find(
              (u) => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
            );
            if (target) {
              setActiveTargetUser(target);
              setLastActiveContact(target);
              try {
                localStorage.setItem('mywahou_last_contact', JSON.stringify(target));
              } catch {}
            }
          }
        }
      }
    });
    return () => unsub();
  }, [currentUser?.id, allUsers, activeConversationId, activeTargetUser, activeSpace]);

  // Request browser notification permission once user connects & persist background notification identity
  useEffect(() => {
    if (currentUser?.id) {
      requestPushNotificationPermission();
      saveBackgroundNotifConfig({
        userId: currentUser.id,
        displayName: currentUser.displayName,
        enabled: currentUser.backgroundNotificationsEnabled !== false,
        updatedAt: Date.now(),
      });
    }
  }, [currentUser?.id, currentUser?.displayName, currentUser?.backgroundNotificationsEnabled]);

  // Background / Disconnected Notification Listener: delivers OS notifications even if user is logged out of session
  useEffect(() => {
    if (currentUser) return;
    const bgConfig = getBackgroundNotifConfigSync();
    if (!bgConfig || !bgConfig.enabled || !bgConfig.userId) return;

    const prevBgTimes: Record<string, number> = {};
    let bgLoaded = false;
    const seenCallIds = new Set<string>();

    const unsubConvos = subscribeUserConversations(bgConfig.userId, (convos) => {
      if (!bgLoaded) {
        convos.forEach((c) => {
          if (c.lastMessage?.timestamp) {
            prevBgTimes[c.id] = c.lastMessage.timestamp;
          }
        });
        bgLoaded = true;
        return;
      }
      convos.forEach((c) => {
        const lastMsg = c.lastMessage;
        const prevTime = prevBgTimes[c.id] || 0;
        if (
          lastMsg &&
          lastMsg.timestamp > prevTime &&
          lastMsg.senderName !== bgConfig.displayName &&
          Date.now() - lastMsg.timestamp < 30000
        ) {
          const otherId = c.participantIds?.find((id) => id !== bgConfig.userId);
          const target = allUsers.find(
            (u) => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
          );
          playNotificationChime();
          showBrowserNotification(
            `${lastMsg.senderName} • my Wahou`,
            lastMsg.type === 'voice'
              ? '🎤 Note vocale reçue'
              : lastMsg.type === 'image'
              ? '🖼️ Photo reçue'
              : lastMsg.text || 'Nouveau message reçu',
            target?.avatarUrl || '/bird-logo.png',
            undefined,
            `bg-msg-${c.id}`
          );
        }
        if (lastMsg?.timestamp) {
          prevBgTimes[c.id] = lastMsg.timestamp;
        }
      });
    });

    const unsubCalls = subscribeIncomingCalls(bgConfig.userId, (calls) => {
      if (calls.length === 0) return;
      const latest = calls[0];
      if (!seenCallIds.has(latest.id)) {
        seenCallIds.add(latest.id);
        showBrowserNotification(
          `Appel entrant - ${appSettings.appName || 'my Wahou'}`,
          `${latest.callerName || 'Un contact'} vous appelle (${
            latest.isVideo || latest.type === 'video' ? 'Vidéo' : 'Audio'
          })`,
          latest.callerAvatar || '/bird-logo.png',
          undefined,
          `bg-call-${latest.id}`
        );
      }
    });

    return () => {
      unsubConvos();
      unsubCalls();
    };
  }, [currentUser, allUsers, appSettings.appName]);

  // Subscribe to Messages for the Active Conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(activeConversationId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeConversationId]);

  // Select a conversation
  const handleSelectConversation = (convoId: string, targetUser?: UserProfile) => {
    setActiveConversationId(convoId);
    let resolved = targetUser;
    if (targetUser) {
      setActiveTargetUser(targetUser);
    } else {
      const convo = conversations.find((c) => c.id === convoId);
      const otherId = convo?.participantIds?.find((id) => id !== currentUser?.id);
      resolved = allUsers.find(
        (u) => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
      );
      setActiveTargetUser(resolved);
    }
    if (resolved) {
      setLastActiveContact(resolved);
      try {
        localStorage.setItem('mywahou_last_contact', JSON.stringify(resolved));
      } catch {}
    }
    setMobileView('chat');
  };

  // Start new chat with chosen user
  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    const convoId = await createOrGetDirectConversation(currentUser.id, targetUser, currentUser.email);
    setLastActiveContact(targetUser);
    try {
      localStorage.setItem('mywahou_last_contact', JSON.stringify(targetUser));
    } catch {}
    handleSelectConversation(convoId, targetUser);
  };

  // Quick message send from floating chat bubble
  const handleQuickSendMessage = async (targetUser: UserProfile, text: string) => {
    if (!currentUser) return;
    const convoId = await createOrGetDirectConversation(currentUser.id, targetUser, currentUser.email);
    const newMsg: ChatMessage = {
      id: `quick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: convoId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      senderTag: currentUser.profileTag,
      type: 'text',
      content: text,
      timestamp: Date.now(),
      isDelivered: true,
      isRead: false,
    };
    await sendMessageToDb(newMsg, targetUser.id);
  };

  // Start Voice or Video Call (supports active chat target or FloatingChatBubble contact)
  const handleStartCall = async (video: boolean, customTarget?: UserProfile) => {
    if (!currentUser) return;
    const target = customTarget || activeTargetUser;
    if (!target) {
      return;
    }

    // Check Call Forfait
    if (!currentUser.isVIP && (currentUser.callMinutes || 0) <= 0) {
      setForfaitModalType('call');
      setIsForfaitModalOpen(true);
      return;
    }

    const convoId =
      activeConversationId && activeTargetUser?.id === target.id
        ? activeConversationId
        : await createOrGetDirectConversation(currentUser.id, target, currentUser.email);

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: CallSession = {
      id: callId,
      callerId: currentUser.id,
      callerName: currentUser.displayName,
      callerAvatar: currentUser.avatarUrl,
      receiverId: target.id,
      receiverName: target.displayName,
      receiverAvatar: target.avatarUrl || '',
      isVideo: video,
      type: video ? 'video' : 'audio',
      status: 'ringing',
      conversationId: convoId,
      createdAt: Date.now(),
    };

    try {
      await createCallSessionInDb(session);
    } catch (err) {
      console.error('Error creating call session:', err);
    }

    setActiveTargetUser(target);
    setActiveConversationId(convoId);
    setActiveCallSession(session);
    setActiveCallRole('caller');
    setIsVideoCall(video);
    setIsCallModalOpen(true);
  };

  // Accept incoming call explicitly (mandatory before communication)
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall || !currentUser) return;
    if (incomingRingStopRef.current) {
      incomingRingStopRef.current();
      incomingRingStopRef.current = null;
    }

    const callerUser: UserProfile =
      allUsers.find((u) => u.id === incomingCall.callerId) || {
        id: incomingCall.callerId,
        email: '',
        displayName: incomingCall.callerName || 'Contact my Wahou',
        avatarUrl: incomingCall.callerAvatar,
        role: 'user',
        isBlocked: false,
        isVIP: false,
        mediaQuota: 0,
        callMinutes: 0,
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

    const convoId =
      incomingCall.conversationId ||
      (await createOrGetDirectConversation(currentUser.id, callerUser, currentUser.email));

    const acceptedSession: CallSession = {
      ...incomingCall,
      status: 'connected',
      startedAt: Date.now(),
    };

    await updateCallSessionInDb(incomingCall.id, {
      status: 'connected',
      startedAt: Date.now(),
    });

    setActiveTargetUser(callerUser);
    setActiveConversationId(convoId);
    setActiveCallSession(acceptedSession);
    setActiveCallRole('receiver');
    setIsVideoCall(incomingCall.type === 'video' || Boolean(incomingCall.isVideo));
    setIncomingCall(null);
    setIsCallModalOpen(true);
  };

  // Decline incoming call
  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;
    if (incomingRingStopRef.current) {
      incomingRingStopRef.current();
      incomingRingStopRef.current = null;
    }
    playCallEndedTone();
    await updateCallSessionInDb(incomingCall.id, {
      status: 'declined',
      endedAt: Date.now(),
    });
    setIncomingCall(null);
  };

  // Login Success Handler
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('mywahou_user', JSON.stringify(user));
    } catch {}
  };

  // Logout Handler
  const handleLogout = () => {
    try {
      localStorage.removeItem('mywahou_user');
    } catch {}
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    setIsAdminModalOpen(false);
  };

  // Always show 10-second Splash Screen on launch ("my Wahou" + "développé par Wastus Spart 2026")
  if (showSplash) {
    return (
      <SplashScreen
        appSettings={appSettings}
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  // If user is not authenticated, show AuthModal
  if (!currentUser) {
    return (
      <div
        id="my-wahou-auth-screen"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', minHeight: '100dvh' }}
        className="fixed inset-0 w-full h-full min-h-[100dvh] isolate bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <AppBackground />
        <div className="relative z-10 w-full flex items-center justify-center">
          <AuthModal
            isOpen={true}
            onLoginSuccess={handleLoginSuccess}
            allUsers={allUsers}
          />
        </div>
      </div>
    );
  }

  // If user has been blocked by Admin
  if (currentUser.isBlocked) {
    return (
      <div className="fixed inset-0 w-full h-full min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 text-zinc-900 dark:text-white">
        <div className="max-w-md p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-red-500/40 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto text-2xl">
            🚫
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Compte my Wahou Suspendu</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Votre compte utilisateur ({currentUser.email}) a été bloqué par l'administrateur du réseau.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-sm font-semibold text-zinc-900 dark:text-white transition"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="my-wahou-app"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        minHeight: '100dvh',
        minWidth: '100%',
        backgroundColor: '#1e1b4b',
      }}
      className="fixed inset-0 w-full h-full min-h-[100dvh] isolate flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans select-none"
    >
      {/* Global Background Layer */}
      <AppBackground />

      {/* Top Banner Announcement if configured */}
      {appSettings.showAnnouncement && appSettings.announcement && (
        <div className="bg-gradient-to-r from-violet-900/95 via-purple-900/95 to-pink-900/95 border-b border-violet-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-zinc-100 z-30 shrink-0 relative">
          <div className="flex items-center gap-2 truncate">
            <span className="text-violet-300 font-bold">📢</span>
            <span className="truncate font-medium">{appSettings.announcement}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => setIsWebLinkModalOpen(true)}
              className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] transition flex items-center gap-1.5"
            >
              <Share2 className="w-3 h-3" />
              <span>Partage</span>
            </button>

            <button
              onClick={() => {
                setForfaitModalType('vip');
                setIsForfaitModalOpen(true);
              }}
              className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] transition"
            >
              Découvrir les Forfaits VIP
            </button>
          </div>
        </div>
      )}

      {/* Top Banner Alert for Existing Accounts without Password */}
      {currentUser && !isPasswordConfigured(currentUser) && currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 text-xs flex items-center justify-between gap-2 shadow-md shrink-0 z-30 relative animate-fade-in">
          <div className="flex items-center gap-2 truncate font-medium">
            <Shield className="w-4 h-4 text-amber-200 shrink-0" />
            <span className="truncate">
              <strong>Sécurisation de compte :</strong> Vous n'avez pas encore défini de mot de passe pour vos discussions.
            </span>
          </div>
          <button
            onClick={() => setIsSetPasswordModalOpen(true)}
            className="px-3 py-1 rounded-xl bg-black/30 hover:bg-black/50 text-white font-bold text-xs whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 border border-white/20 shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Configurer mon mot de passe 🔒</span>
          </button>
        </div>
      )}

      {/* Main Layout Container with Navigation Rail & Active Space */}
      <div
        className={`flex-1 min-h-0 flex w-full overflow-hidden relative z-10 ${
          isInsideConversation ? 'pb-0' : 'pb-14 md:pb-0'
        }`}
      >
        {/* Universal Navigation Rail */}
        <NavigationRail
          currentSpace={activeSpace}
          onSelectSpace={(space) => {
            setActiveSpace(space);
            if (space === 'discussion') {
              setMobileView('sidebar');
            }
          }}
          currentUser={currentUser}
          appSettings={appSettings}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          onOpenWebLink={() => setIsWebLinkModalOpen(true)}
          unreadCount={totalUnreadCount}
          isInsideConversation={isInsideConversation}
        />

        {/* SPACE 1: DISCUSSIONS (Sidebar + Chat) */}
        {activeSpace === 'discussion' && (
          <div className="flex-1 min-h-0 flex w-full h-full overflow-hidden relative">
            <div
              className={`h-full min-h-0 ${
                mobileView === 'sidebar' ? 'w-full block' : 'hidden md:block'
              } md:w-80 lg:w-96 shrink-0`}
            >
              <Sidebar
                currentUser={currentUser}
                conversations={conversations}
                allUsers={allUsers}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onOpenNewChat={() => setIsNewChatModalOpen(true)}
                onOpenForfaitModal={() => {
                  setProfileSubTab('abonnements');
                  setActiveSpace('profil');
                }}
                onOpenProfileModal={() => {
                  setProfileSubTab('profil');
                  setActiveSpace('profil');
                }}
                onOpenAdminModal={() => setIsAdminModalOpen(true)}
                onOpenWebLink={() => setIsWebLinkModalOpen(true)}
                onOpenJourneeLive={() => setActiveSpace('live')}
                onOpenLisanga={() => setActiveSpace('lisanga')}
                onOpenEntreprise={() => {
                  setProfileSubTab('entreprise');
                  setActiveSpace('profil');
                }}
                onStartCall={(participant, isVideo) => {
                  handleStartCall(isVideo, participant);
                }}
                appSettings={appSettings}
              />
            </div>

            <div
              className={`flex-1 min-h-0 h-full ${
                mobileView === 'chat' ? 'w-full flex' : 'hidden md:flex'
              } flex-col`}
            >
              {activeConversationId ? (
                <ChatView
                  conversationId={activeConversationId}
                  currentUser={currentUser}
                  targetUser={activeTargetUser}
                  messages={messages}
                  appSettings={appSettings}
                  onStartCall={(video) => handleStartCall(video)}
                  onBack={() => setMobileView('sidebar')}
                  onOpenForfaitModal={() => {
                    setForfaitModalType('media');
                    setIsForfaitModalOpen(true);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-950">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white to-sky-50 border border-sky-200/80 dark:border-white/20 flex items-center justify-center mb-4 shadow-2xl shadow-violet-600/20 p-2 overflow-hidden">
                    <BrandBirdLogo
                      logoUrl={appSettings.logoUrl}
                      alt={appSettings.appName || 'my Wahou'}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                  </div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                    Bienvenue sur {appSettings.appName || 'my Wahou'}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-6">
                    Sélectionnez une discussion dans le menu ou démarrez un nouvel échange <strong>100% gratuit</strong> en texte ou note vocale.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setIsNewChatModalOpen(true)}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-violet-600/30 transition"
                    >
                      Lancer une nouvelle discussion
                    </button>

                    <button
                      onClick={() => setIsWebLinkModalOpen(true)}
                      className="px-5 py-3 rounded-2xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-bold text-sm transition flex items-center gap-2 shadow-sm"
                    >
                      <Share2 className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                      <span>Partager l'application</span>
                    </button>
                  </div>

                  <div className="mt-12 text-xs font-semibold text-zinc-500">
                    ⚡ <span className="text-violet-600 dark:text-violet-400">développé par Wastus Spart 2026</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SPACE 2: LISANGA (Groupes & Communautés) */}
        {activeSpace === 'lisanga' && (
          <LisangaView
            currentUser={currentUser}
            allUsers={allUsers}
            conversations={conversations}
            appSettings={appSettings}
            onActiveGroupChange={setIsInsideLisangaGroup}
          />
        )}

        {/* SPACE 3: JOURNÉE LIVE (STORIES 24H) */}
        {activeSpace === 'live' && (
          <JourneeLiveView
            currentUser={currentUser}
            allUsers={allUsers}
            conversations={conversations}
            onOpenForfaitModal={() => {
              setForfaitModalType('vip');
              setIsForfaitModalOpen(true);
            }}
            onSelectUserForChat={(user) => {
              handleStartChatWithUser(user);
              setActiveSpace('discussion');
            }}
          />
        )}

        {/* SPACE 4: MON PROFIL */}
        {activeSpace === 'profil' && (
          <ProfileView
            currentUser={currentUser}
            appSettings={appSettings}
            activeTab={profileSubTab}
            onTabChange={(tab) => setProfileSubTab(tab)}
            onOpenForfaitModal={(type) => {
              setForfaitModalType(type || 'vip');
              setIsForfaitModalOpen(true);
            }}
            onOpenJourneeLive={() => setActiveSpace('live')}
            onLogout={handleLogout}
          />
        )}

        {/* SPACE 5: MOBILE APP & IPHONE PWA */}
        {activeSpace === 'mobile_app' && (
          <MobileAppView appSettings={appSettings} />
        )}
      </div>

      {/* INCOMING CALL OVERLAY (REQUIRES EXPLICIT ACCEPTANCE BEFORE CONNECTING) */}
      {incomingCall && !isCallModalOpen && (
        <div
          id="incoming-call-modal"
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in select-none"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-violet-500/40 shadow-2xl p-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/15 dark:bg-violet-600/30 border border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-bold">
              {(incomingCall.type === 'video' || incomingCall.isVideo) ? (
                <Video className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Phone className="w-3.5 h-3.5 animate-pulse" />
              )}
              <span>
                {(incomingCall.type === 'video' || incomingCall.isVideo) ? 'Appel vidéo entrant...' : 'Appel audio entrant...'}
              </span>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-violet-500/25 animate-ping" />
                <UserAvatar
                  name={incomingCall.callerName || 'my Wahou'}
                  avatarUrl={incomingCall.callerAvatar}
                  size="xl"
                  className="border-4 border-violet-500 shadow-2xl relative z-10"
                />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                  {incomingCall.callerName || 'Utilisateur my Wahou'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Acceptez l'appel pour démarrer la discussion en direct
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                id="incoming-call-decline-btn"
                type="button"
                onClick={handleDeclineIncomingCall}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-active:scale-95 transition">
                  <PhoneOff className="w-6 h-6" />
                </span>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">Refuser</span>
              </button>

              <button
                id="incoming-call-accept-btn"
                type="button"
                onClick={handleAcceptIncomingCall}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 group-active:scale-95 transition animate-bounce">
                  {(incomingCall.type === 'video' || incomingCall.isVideo) ? (
                    <Video className="w-7 h-7" />
                  ) : (
                    <Phone className="w-7 h-7" />
                  )}
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Accepter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Forfaits Boutique */}
      <ForfaitModal
        isOpen={isForfaitModalOpen}
        onClose={() => setIsForfaitModalOpen(false)}
        currentUser={currentUser}
        initialSelectedType={forfaitModalType}
        onForfaitActivated={(updated) => setCurrentUser(updated)}
      />

      {/* MODAL: Call Screen with Firestore Signaling & WebRTC */}
      {activeTargetUser && (
        <CallModal
          isOpen={isCallModalOpen}
          onClose={() => {
            setIsCallModalOpen(false);
            setActiveCallSession(null);
          }}
          targetUser={activeTargetUser}
          currentUser={currentUser}
          isVideoCall={isVideoCall}
          onOpenForfaitModal={() => {
            setForfaitModalType('call');
            setIsForfaitModalOpen(true);
          }}
          conversationId={activeConversationId || ''}
          callSessionId={activeCallSession?.id}
          callRole={activeCallRole}
          existingSession={activeCallSession}
        />
      )}

      {/* MODAL: Profile Editor */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onOpenForfaitModal={() => {
          setForfaitModalType('vip');
          setIsForfaitModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* MODAL: Super Admin Dashboard */}
      {isUserAdmin(currentUser) && (
        <div style={{ display: isAdminModalOpen ? 'block' : 'none' }}>
          <AdminDashboard
            currentUser={currentUser!}
            allUsers={allUsers}
            appSettings={appSettings}
            onClose={() => setIsAdminModalOpen(false)}
            onOpenWebLink={() => setIsWebLinkModalOpen(true)}
          />
        </div>
      )}

      {/* MODAL: New Chat Contact Picker */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        allUsers={allUsers}
        currentUser={currentUser}
        onSelectUser={handleStartChatWithUser}
      />

      {/* MODAL: Web Link & Online Access */}
      <WebLinkModal
        isOpen={isWebLinkModalOpen}
        onClose={() => setIsWebLinkModalOpen(false)}
        appName={appSettings.appName || 'my Wahou'}
      />

      {/* WHATSAPP-STYLE PUSH NOTIFICATION BANNER */}
      <WhatsAppPushBanner
        push={whatsappPushData}
        onOpenChat={(convoId, targetUser) => {
          setActiveSpace('discussion');
          handleSelectConversation(convoId, targetUser);
        }}
        onClose={() => setWhatsappPushData(null)}
      />

      {/* FLOATING CHAT BUBBLE (WITH AUDIO & VIDEO CALL BUTTONS) */}
      {currentUser && lastActiveContact && (
        <FloatingChatBubble
          lastContact={lastActiveContact}
          unreadCount={
            conversations.find(
              (c) =>
                c.participantIds?.includes(lastActiveContact.id) ||
                c.participantIds?.includes(lastActiveContact.email?.toLowerCase())
            )?.unreadCount?.[currentUser.id] || 0
          }
          recentMessages={messages}
          currentUserId={currentUser.id}
          onOpenFullChat={(target) => {
            setActiveSpace('discussion');
            handleStartChatWithUser(target);
          }}
          onQuickSendMessage={(target, text) => {
            handleQuickSendMessage(target, text);
          }}
          onStartCall={(target, isVideo) => {
            handleStartCall(isVideo, target);
          }}
        />
      )}

      {/* MODAL: Configurer mot de passe pour compte existant */}
      {currentUser && (
        <SetPasswordModal
          isOpen={isSetPasswordModalOpen}
          onClose={() => setIsSetPasswordModalOpen(false)}
          user={currentUser}
          title="Configurer votre mot de passe"
          description="Pour que personne d'autre ne puisse se connecter à votre compte, vous devez enregistrer votre mot de passe personnel."
          onPasswordSet={(updated) => {
            setCurrentUser(updated);
            try {
              localStorage.setItem('mywahou_user', JSON.stringify(updated));
            } catch {}
            setIsSetPasswordModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
