import { useState, useEffect } from 'react';
import {
  UserProfile,
  ChatMessage,
  Conversation,
  AppSettings
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
  INITIAL_USERS,
  ADMIN_EMAIL,
  isUserAdmin
} from './services/dbService';

import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { JourneeLiveView } from './components/JourneeLiveView';
import { AbonnementsView } from './components/AbonnementsView';
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
import { WhatsAppPushBanner, WhatsAppPushData } from './components/WhatsAppPushBanner';
import { FloatingChatBubble } from './components/FloatingChatBubble';
import {
  playNotificationChime,
  playMessageClickSound,
  showBrowserNotification,
  requestPushNotificationPermission,
} from './utils/soundUtils';

import { ArrowLeft, MessageSquare, Shield, Share2, Zap } from 'lucide-react';

export default function App() {
  // App Global Settings (Logo, name, branding, announcement)
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  // Active space view state ('discussion' | 'lisanga' | 'live' | 'profil' | 'mobile_app')
  const [activeSpace, setActiveSpace] = useState<AppSpace>('discussion');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('profil');

  // Users and Auth State
  const [allUsers, setAllUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // Default load from localStorage if previously connected
    const saved = localStorage.getItem('mywahou_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear out any obsolete fake/mock accounts
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

        // Strict role validation
        if (parsed.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          parsed.role = 'admin';
          parsed.isVIP = true;
          parsed.mediaQuota = 9999;
          parsed.callMinutes = 9999;
        } else {
          parsed.role = 'user';
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Conversations and Messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTargetUser, setActiveTargetUser] = useState<UserProfile | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Last Active Contact for Chat Bubble ("Bulle flottante de discussion")
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
  const prevConversationsRef = useState<Record<string, number>>({})[0];
  const initialLoadRef = useState({ loaded: false })[0];

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!currentUser);
  const [isForfaitModalOpen, setIsForfaitModalOpen] = useState(false);
  const [forfaitModalType, setForfaitModalType] = useState<'media' | 'call' | 'vip'>('vip');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isWebLinkModalOpen, setIsWebLinkModalOpen] = useState(false);

  // Mobile navigation view state ('sidebar' | 'chat')
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // Compute total unread messages count for visual notification badge (Pastille rouge)
  const totalUnreadCount = conversations.reduce((acc, c) => {
    if (!currentUser?.id) return acc;
    return acc + (c.unreadCount?.[currentUser.id] || 0);
  }, 0);

  // User online presence heartbeat & window listener
  useEffect(() => {
    if (!currentUser?.id) return;

    // Set online on load
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

      // Keep current user object synchronized with Firestore updates (e.g. if admin blocks or credits)
      if (currentUser) {
        const updatedSelf = users.find(u => u.id === currentUser.id);
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
          localStorage.setItem('mywahou_user', JSON.stringify(updatedSelf));
        }
      }
    });
    return () => unsub();
  }, [currentUser?.id]);

  // Subscribe to Conversations for Current User & Push Notification triggers
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserConversations(
      currentUser.id,
      (convos) => {
        setConversations(convos);

      // Check for newly received incoming messages across conversations
      if (initialLoadRef.loaded) {
        convos.forEach((c) => {
          const lastMsg = c.lastMessage;
          const prevTime = prevConversationsRef[c.id] || 0;
          if (
            lastMsg &&
            lastMsg.timestamp > prevTime &&
            lastMsg.senderName !== currentUser.displayName &&
            Date.now() - lastMsg.timestamp < 20000
          ) {
            // New incoming message!
            const otherId = c.participantIds?.find((id) => id !== currentUser.id);
            const target = allUsers.find(
              (u) => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
            );

            // Trigger notification sound (click / chime)
            playNotificationChime();

            // Native Browser Push Notification
            showBrowserNotification(
              lastMsg.senderName,
              lastMsg.type === 'voice'
                ? '🎤 Note vocale reçue'
                : lastMsg.type === 'image'
                ? '🖼️ Photo reçue'
                : lastMsg.text || 'Nouveau message reçu',
              target?.avatarUrl
            );

            // Pop WhatsApp Push Banner if user is not looking at this conversation
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
            prevConversationsRef[c.id] = lastMsg.timestamp;
          }
        });
      } else {
        // Record initial timestamps without triggering alerts
        convos.forEach((c) => {
          if (c.lastMessage?.timestamp) {
            prevConversationsRef[c.id] = c.lastMessage.timestamp;
          }
        });
        initialLoadRef.loaded = true;
      }

      // Auto-select or refresh target user
      if (convos.length > 0) {
        if (!activeConversationId) {
          const first = convos[0];
          setActiveConversationId(first.id);
          const otherId = first.participantIds?.find(id => id !== currentUser.id);
          const target = allUsers.find(
            u => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
          );
          setActiveTargetUser(target);
          if (target) {
            setLastActiveContact(target);
            localStorage.setItem('mywahou_last_contact', JSON.stringify(target));
          }
        } else if (!activeTargetUser) {
          const current = convos.find(c => c.id === activeConversationId);
          if (current) {
            const otherId = current.participantIds?.find(id => id !== currentUser.id);
            const target = allUsers.find(
              u => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
            );
            if (target) {
              setActiveTargetUser(target);
              setLastActiveContact(target);
              localStorage.setItem('mywahou_last_contact', JSON.stringify(target));
            }
          }
        }
      }
    });
    return () => unsub();
  }, [currentUser?.id, allUsers, activeConversationId, activeTargetUser, activeSpace]);

  // Request browser notification permission once user connects
  useEffect(() => {
    if (currentUser) {
      requestPushNotificationPermission();
    }
  }, [currentUser?.id]);

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
      const convo = conversations.find(c => c.id === convoId);
      const otherId = convo?.participantIds?.find(id => id !== currentUser?.id);
      resolved = allUsers.find(
        u => u.id === otherId || u.email?.toLowerCase() === otherId?.toLowerCase()
      );
      setActiveTargetUser(resolved);
    }
    if (resolved) {
      setLastActiveContact(resolved);
      localStorage.setItem('mywahou_last_contact', JSON.stringify(resolved));
    }
    setMobileView('chat');
  };

  // Start new chat with chosen user
  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    const convoId = await createOrGetDirectConversation(currentUser.id, targetUser, currentUser.email);
    setLastActiveContact(targetUser);
    localStorage.setItem('mywahou_last_contact', JSON.stringify(targetUser));
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

  // Start Voice or Video Call
  const handleStartCall = (video: boolean) => {
    if (!activeTargetUser) {
      alert('Veuillez sélectionner un contact avec qui discuter avant de lancer un appel.');
      return;
    }

    // Check Call Forfait
    if (!currentUser?.isVIP && (currentUser?.callMinutes || 0) <= 0) {
      setForfaitModalType('call');
      setIsForfaitModalOpen(true);
      return;
    }

    setIsVideoCall(video);
    setIsCallModalOpen(true);
  };

  // Login Success Handler
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('mywahou_user', JSON.stringify(user));
    setIsAuthModalOpen(false);
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('mywahou_user');
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    setIsAdminModalOpen(false);
    setIsAuthModalOpen(true);
  };

  // If user is not authenticated, show AuthModal
  if (!currentUser) {
    return (
      <div className="w-full h-screen bg-zinc-950 flex items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          onLoginSuccess={handleLoginSuccess}
          allUsers={allUsers}
        />
      </div>
    );
  }

  // If user has been blocked by Admin
  if (currentUser.isBlocked) {
    return (
      <div className="w-full h-screen bg-zinc-950 flex items-center justify-center p-4 text-white">
        <div className="max-w-md p-8 rounded-3xl bg-zinc-900 border border-red-500/40 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center mx-auto text-2xl">
            🚫
          </div>
          <h2 className="text-2xl font-bold text-white">Compte my Wahou Suspendu</h2>
          <p className="text-sm text-zinc-400">
            Votre compte utilisateur ({currentUser.email}) a été bloqué par l'administrateur du réseau.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-white transition"
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
      className="w-full h-screen bg-zinc-950 flex flex-col overflow-hidden text-zinc-100 font-sans select-none"
    >
      {/* Top Banner Announcement if configured */}
      {appSettings.showAnnouncement && appSettings.announcement && (
        <div className="bg-gradient-to-r from-violet-900/90 via-purple-900/90 to-pink-900/90 border-b border-violet-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-zinc-100 z-30 shrink-0">
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

      {/* Main Layout Container with Navigation Rail & Active Space */}
      <div className="flex-1 flex w-full h-full overflow-hidden relative pb-14 md:pb-0">
        {/* Universal Navigation Rail (Desktop side bar + Mobile bottom bar) */}
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
        />

        {/* SPACE 1: DISCUSSIONS (Sidebar + Chat) */}
        {activeSpace === 'discussion' && (
          <div className="flex-1 flex w-full h-full overflow-hidden relative">
            {/* Sidebar (Conversations & Contacts) */}
            <div
              className={`h-full ${
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
                appSettings={appSettings}
              />
            </div>

            {/* Chat Main View */}
            <div
              className={`flex-1 h-full ${
                mobileView === 'chat' ? 'w-full flex' : 'hidden md:flex'
              } flex-col`}
            >
              {/* Mobile Back to conversations button */}
              <div className="md:hidden p-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => setMobileView('sidebar')}
                  className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold px-2 py-1 rounded-lg hover:bg-zinc-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour aux discussions</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsWebLinkModalOpen(true)}
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs flex items-center gap-1"
                    title="Partage"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Partage</span>
                  </button>

                  {isUserAdmin(currentUser) && (
                    <button
                      onClick={() => setIsAdminModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1"
                    >
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </button>
                  )}
                </div>
              </div>

              {activeConversationId ? (
                <ChatView
                  conversationId={activeConversationId}
                  currentUser={currentUser}
                  targetUser={activeTargetUser}
                  messages={messages}
                  appSettings={appSettings}
                  onStartCall={handleStartCall}
                  onOpenForfaitModal={() => {
                    setForfaitModalType('media');
                    setIsForfaitModalOpen(true);
                  }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-600 flex items-center justify-center text-white mb-4 shadow-2xl shadow-violet-600/30">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">
                    Bienvenue sur {appSettings.appName || 'my Wahou'}
                  </h2>
                  <p className="text-sm text-zinc-400 max-w-md mb-6">
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
                      className="px-5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-sm transition flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4 text-violet-400" />
                      <span>Partager l'application</span>
                    </button>
                  </div>

                  {/* Developer signature in empty state */}
                  <div className="mt-12 text-xs font-semibold text-zinc-500">
                    ⚡ <span className="text-violet-400">développer part wastus spart 2026</span>
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

        {/* SPACE 4: MON PROFIL (avec Abonnements et Entreprise intégrés) */}
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

      {/* MODAL: Forfaits Boutique */}
      <ForfaitModal
        isOpen={isForfaitModalOpen}
        onClose={() => setIsForfaitModalOpen(false)}
        currentUser={currentUser}
        initialSelectedType={forfaitModalType}
        onForfaitActivated={(updated) => setCurrentUser(updated)}
      />

      {/* MODAL: Call Screen */}
      {activeTargetUser && (
        <CallModal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          targetUser={activeTargetUser}
          currentUser={currentUser}
          isVideoCall={isVideoCall}
          onOpenForfaitModal={() => {
            setForfaitModalType('call');
            setIsForfaitModalOpen(true);
          }}
          conversationId={activeConversationId || ''}
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

      {/* FLOATING CHAT BUBBLE (CHAT HEAD POUR DERNIÈRE DISCUSSION) */}
      {currentUser && lastActiveContact && (
        <FloatingChatBubble
          lastContact={lastActiveContact}
          unreadCount={
            conversations.find((c) =>
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
        />
      )}
    </div>
  );
}
