import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Shield,
  Share2,
  Check,
  CheckCheck,
  Camera,
  MoreVertical,
  Archive,
  Star,
  Users,
  Sparkles,
  Phone,
  Trash2,
  Heart,
  Eraser,
  X
} from 'lucide-react';
import { UserProfile, Conversation, AppSettings } from '../types';
import {
  ADMIN_EMAIL,
  getContactDisplayName,
  getUserPinnedConversations,
  togglePinUserConversation,
  getUserArchivedConversations,
  toggleArchiveUserConversation,
  getUserFavoriteConversations,
  toggleFavoriteUserConversation,
  deleteEntireConversationFromDb,
  clearAllMessagesInConversationFromDb
} from '../services/dbService';
import { UserAvatar } from './UserAvatar';
import { BrandBirdLogo } from './BrandBirdLogo';
import { playUiTapSound, playHapticClickSound } from '../utils/soundUtils';

interface SidebarProps {
  currentUser: UserProfile;
  conversations: Conversation[];
  allUsers: UserProfile[];
  activeConversationId: string | null;
  onSelectConversation: (convoId: string, targetUser?: UserProfile) => void;
  onOpenNewChat: () => void;
  onOpenForfaitModal: () => void;
  onOpenProfileModal: () => void;
  onOpenAdminModal: () => void;
  onOpenWebLink: () => void;
  onOpenJourneeLive?: () => void;
  onOpenLisanga?: () => void;
  onOpenEntreprise?: () => void;
  onStartCall?: (participant: UserProfile, isVideo: boolean) => void;
  appSettings: AppSettings;
}

type FilterCategory = 'all' | 'unread' | 'favorites' | 'groups';

export function Sidebar({
  currentUser,
  conversations,
  allUsers,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenAdminModal,
  onOpenWebLink,
  onOpenProfileModal,
  onStartCall,
  appSettings,
}: SidebarProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // 6 options context menu states
  const [selectedConvoForMenu, setSelectedConvoForMenu] = useState<{
    convo: Conversation;
    participant?: UserProfile;
  } | null>(null);
  const [confirmDeleteConvoId, setConfirmDeleteConvoId] = useState<string | null>(null);
  const [confirmClearConvoId, setConfirmClearConvoId] = useState<string | null>(null);

  // Long-press detection timer ref
  const pressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef(false);

  const fileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Find other participant in 1-on-1 convo
  const getConvoParticipant = (convo: Conversation): UserProfile | undefined => {
    const otherId = convo.participantIds?.find((id) => id !== currentUser.id);
    if (!otherId) return undefined;

    let found = allUsers.find((u) => u.id === otherId);
    if (found) return found;

    found = allUsers.find(
      (u) =>
        u.email?.toLowerCase() === otherId.toLowerCase() ||
        u.id.toLowerCase() === otherId.toLowerCase()
    );
    if (found) return found;

    return undefined;
  };

  const pinnedIds = getUserPinnedConversations(currentUser.id);
  const archivedIds = getUserArchivedConversations(currentUser.id);
  const favoriteIds = getUserFavoriteConversations(currentUser.id);

  // Filter conversations
  const filteredConversations = conversations.filter((convo) => {
    const isArchived = archivedIds.includes(convo.id);
    if (showArchived) {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }

    const otherId = convo.participantIds?.find((id) => id !== currentUser.id);
    const participant = getConvoParticipant(convo);
    const name = getContactDisplayName(participant, convo, otherId, currentUser.id);
    const email = participant?.email || '';
    const tag = participant?.profileTag || '';
    const query = searchFilter.toLowerCase();
    const matchesSearch =
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      tag.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    const unread = convo.unreadCount?.[currentUser.id] || 0;

    if (activeCategory === 'unread') {
      return unread > 0;
    }
    if (activeCategory === 'favorites') {
      return favoriteIds.includes(convo.id);
    }
    if (activeCategory === 'groups') {
      return (convo.participantIds?.length || 0) > 2 || convo.type === 'lisanga';
    }

    return true;
  });

  // Sort pinned conversations at the very top
  filteredConversations.sort((a, b) => {
    const isAPinned = pinnedIds.includes(a.id);
    const isBPinned = pinnedIds.includes(b.id);
    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const handleStartPress = (convo: Conversation, participant?: UserProfile) => {
    isLongPressTriggeredRef.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

    // Trigger context menu after holding
    pressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      playHapticClickSound();
      setSelectedConvoForMenu({ convo, participant });
    }, 1800);
  };

  const handleCancelPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const totalUnreadCount = conversations.reduce(
    (sum, c) => sum + (c.unreadCount?.[currentUser.id] || 0),
    0
  );

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <aside
      id="main-sidebar"
      className="w-full md:w-80 lg:w-96 glass-titanium border-r border-zinc-200 dark:border-white/10 flex flex-col h-full select-none relative z-10"
    >
      {/* Hidden camera input for quick photo */}
      <input
        ref={fileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onOpenNewChat();
          }
        }}
      />

      {/* Top Header matching Frosted Titanium Glass */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/40 backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white drop-shadow-sm lowercase shrink-0">
              chats
            </h1>
            <div className="flex items-center gap-1.5 min-w-0 shrink-0 pl-0.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-white to-sky-50 border border-sky-200/90 dark:border-white/25 p-0.5 shadow-md flex items-center justify-center overflow-hidden shrink-0">
                <BrandBirdLogo
                  logoUrl={appSettings.logoUrl}
                  alt="Oiseau my Wahou"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <span className="text-xs sm:text-sm font-black tracking-tight bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent dark:from-cyan-300 dark:via-violet-300 dark:to-pink-400 whitespace-nowrap">
                {appSettings.appName || 'my Wahou'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 relative shrink-0" ref={menuRef}>
            {/* Quick Camera Action */}
            <button
              id="sidebar-quick-camera-btn"
              onClick={() => {
                playUiTapSound();
                fileCameraInputRef.current?.click();
              }}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/15 transition flex items-center justify-center active:scale-95 shadow-sm"
              title="Prendre une photo"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Verified / Admin Shield */}
            <button
              id="admin-top-shortcut-btn"
              onClick={() => {
                playUiTapSound();
                if (
                  currentUser.role === 'admin' &&
                  currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                ) {
                  onOpenAdminModal();
                } else {
                  onOpenProfileModal();
                }
              }}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 border border-emerald-500/30 transition flex items-center justify-center active:scale-95 shadow-sm"
              title="Statut vérifié & Sécurité"
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* Glowing Gradient New Chat Button */}
            <button
              id="sidebar-new-chat-icon-btn"
              onClick={() => {
                playUiTapSound();
                onOpenNewChat();
              }}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 text-white shadow-lg shadow-violet-600/50 border border-white/30 transition flex items-center justify-center active:scale-95 animate-pulse"
              title="Nouvelle discussion"
            >
              <Plus className="w-4 h-4 font-black" />
            </button>

            {/* Secondary Plus / More Menu */}
            <button
              id="sidebar-dots-menu-btn"
              onClick={() => {
                playUiTapSound();
                setShowOptionsMenu(!showOptionsMenu);
              }}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/15 transition flex items-center justify-center active:scale-95 shadow-sm"
              title="Options & Partage"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showOptionsMenu && (
              <div className="absolute top-11 right-0 w-56 glass-titanium-dock rounded-2xl shadow-2xl py-2 z-50 animate-fade-in text-xs border border-zinc-200 dark:border-white/15">
                <button
                  onClick={() => {
                    playUiTapSound();
                    setShowOptionsMenu(false);
                    onOpenNewChat();
                  }}
                  className="w-full px-4 py-2.5 text-left text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900/5 dark:hover:bg-white/10 flex items-center gap-2.5 transition"
                >
                  <Plus className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                  <span className="font-semibold">Nouvelle discussion</span>
                </button>

                <button
                  onClick={() => {
                    playUiTapSound();
                    setShowOptionsMenu(false);
                    onOpenWebLink();
                  }}
                  className="w-full px-4 py-2.5 text-left text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900/5 dark:hover:bg-white/10 flex items-center gap-2.5 transition"
                >
                  <Share2 className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                  <span className="font-semibold">Partager l'application</span>
                </button>

                <button
                  onClick={() => {
                    playUiTapSound();
                    setShowOptionsMenu(false);
                    onOpenProfileModal();
                  }}
                  className="w-full px-4 py-2.5 text-left text-zinc-800 dark:text-zinc-200 hover:bg-zinc-900/5 dark:hover:bg-white/10 flex items-center gap-2.5 transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="font-semibold">Mon profil & Forfait</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Frosted Glass Search Bar */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="sidebar-search-input"
            type="text"
            placeholder="Rechercher une discussion..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 transition shadow-inner"
          />
        </div>

        {/* Horizontal Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => {
              playUiTapSound();
              setActiveCategory('all');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition duration-200 ${
              activeCategory === 'all'
                ? 'glass-pill-active text-zinc-900 dark:text-white font-bold shadow-md shadow-violet-950/20 dark:shadow-violet-950/40'
                : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/5'
            }`}
          >
            Tous
          </button>

          <button
            onClick={() => {
              playUiTapSound();
              setActiveCategory('unread');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition duration-200 flex items-center gap-1.5 ${
              activeCategory === 'unread'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold shadow-md shadow-violet-600/30 border border-white/20'
                : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/5'
            }`}
          >
            <span>Non lus</span>
            {totalUnreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-md">
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              playUiTapSound();
              setActiveCategory('favorites');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition duration-200 flex items-center gap-1.5 ${
              activeCategory === 'favorites'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/30 border border-amber-400'
                : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/5'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Favoris</span>
          </button>

          <button
            onClick={() => {
              playUiTapSound();
              setActiveCategory('groups');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition duration-200 flex items-center gap-1.5 ${
              activeCategory === 'groups'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md shadow-cyan-600/30 border border-white/20'
                : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Groupes</span>
          </button>
        </div>
      </div>

      {/* "Archivées" Row */}
      <div
        onClick={() => {
          playUiTapSound();
          setShowArchived(!showArchived);
        }}
        className={`px-4 py-2.5 border-b border-zinc-200/80 dark:border-white/5 cursor-pointer flex items-center justify-between text-xs transition ${
          showArchived ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' : 'hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-zinc-200/80 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-300/60 dark:border-white/5">
            <Archive className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold">{showArchived ? 'Retour aux discussions' : 'Archivées'}</span>
        </div>
        <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-200/70 dark:bg-white/5 px-2 py-0.5 rounded-full">
          {archivedIds.length}
        </span>
      </div>

      {/* Conversations List with Floating Glass Cards (Photo 2 design) */}
      <div
        id="conversations-list"
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
      >
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 flex items-center justify-center mx-auto shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs text-zinc-400">
              {searchFilter
                ? 'Aucune discussion trouvée.'
                : activeCategory !== 'all'
                ? `Aucune discussion dans "${activeCategory}".`
                : 'Aucune discussion en cours.'}
            </p>
            <button
              onClick={() => {
                playUiTapSound();
                onOpenNewChat();
              }}
              className="text-xs text-cyan-400 hover:text-pink-400 font-semibold underline"
            >
              Démarrer une conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((convo) => {
            const isActive = activeConversationId === convo.id;
            const otherId = convo.participantIds?.find((id) => id !== currentUser.id);
            const participant = getConvoParticipant(convo);
            const contactName = getContactDisplayName(participant, convo, otherId, currentUser.id);
            const unread = convo.unreadCount?.[currentUser.id] || 0;
            const hasUnread = unread > 0;
            const isSelfLast = convo.lastMessage?.senderId === currentUser.id;
            const isPinned = pinnedIds.includes(convo.id);
            const isFavorite = favoriteIds.includes(convo.id);

            return (
              <div
                key={convo.id}
                id={`convo-item-${convo.id}`}
                onMouseDown={() => handleStartPress(convo, participant)}
                onMouseUp={handleCancelPress}
                onMouseLeave={handleCancelPress}
                onTouchStart={() => handleStartPress(convo, participant)}
                onTouchEnd={handleCancelPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  playHapticClickSound();
                  setSelectedConvoForMenu({ convo, participant });
                }}
                onClick={() => {
                  if (isLongPressTriggeredRef.current) return;
                  playUiTapSound();
                  onSelectConversation(convo.id, participant);
                }}
                className={`p-3.5 rounded-3xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 relative group active:scale-[0.98] ${
                  isActive
                    ? 'glass-convo-card-active'
                    : isPinned
                    ? 'bg-amber-500/5 border border-amber-500/20 shadow-md shadow-amber-500/5'
                    : 'glass-convo-card'
                }`}
              >
                {/* Contact Avatar with Neon Border */}
                <UserAvatar
                  name={contactName}
                  avatarUrl={participant?.avatarUrl || convo.avatarUrl}
                  size="md"
                  isOnline={participant?.isOnline}
                  showOnlineStatus={true}
                  isVIP={participant?.isVIP}
                  className={isActive ? 'ring-2 ring-violet-400 shadow-md shadow-violet-500/40' : ''}
                />

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {isPinned && (
                        <span title="Épinglée en tête (Option 1)">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        </span>
                      )}
                      {isFavorite && (
                        <span title="Favoris (Option 4)">
                          <Heart className="w-3 h-3 text-pink-400 fill-pink-400 shrink-0" />
                        </span>
                      )}
                      <span
                        className={`text-sm truncate ${
                          hasUnread || isActive ? 'font-black text-zinc-900 dark:text-white' : 'font-bold text-zinc-800 dark:text-zinc-100'
                        }`}
                      >
                        {contactName}
                      </span>
                      {participant?.profileTag && (
                        <span className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300 font-bold bg-cyan-500/10 dark:bg-cyan-950/40 px-1.5 py-0.2 rounded-md border border-cyan-500/20">
                          {participant.profileTag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {formatTimestamp(convo.updatedAt || convo.lastMessage?.timestamp)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playHapticClickSound();
                          setSelectedConvoForMenu({ convo, participant });
                        }}
                        className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition opacity-0 group-hover:opacity-100"
                        title="6 options de la discussion"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate flex items-center gap-1.5 ${
                        hasUnread ? 'font-bold text-cyan-700 dark:text-cyan-300' : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {isSelfLast && (
                        <span className="inline-block shrink-0">
                          {convo.lastMessage?.isRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-zinc-400 inline" />
                          )}
                        </span>
                      )}
                      <span className="truncate">
                        {convo.lastMessage?.text || 'Commencer la discussion...'}
                      </span>
                    </p>

                    {hasUnread && (
                      <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-lg shadow-red-500/50 ring-2 ring-white/20 animate-pulse">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / User quick state */}
      <div className="p-3 border-t border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-md flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2 truncate">
          <UserAvatar
            name={currentUser.displayName}
            avatarUrl={currentUser.avatarUrl}
            size="sm"
          />
          <div className="truncate">
            <div className="font-bold text-zinc-900 dark:text-white truncate">{currentUser.displayName}</div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{currentUser.profileTag}</div>
          </div>
        </div>

        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          En ligne
        </span>
      </div>

      {/* MODAL 6 OPTIONS CONTEXTUELLES DE DISCUSSION */}
      {selectedConvoForMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-3xl p-5 max-w-sm sm:max-w-md w-full shadow-2xl space-y-3.5">
            {/* Header contact */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar
                  name={getContactDisplayName(selectedConvoForMenu.participant, selectedConvoForMenu.convo, undefined, currentUser.id)}
                  avatarUrl={selectedConvoForMenu.participant?.avatarUrl || selectedConvoForMenu.convo.avatarUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base truncate">
                    {getContactDisplayName(selectedConvoForMenu.participant, selectedConvoForMenu.convo, undefined, currentUser.id)}
                  </h3>
                  <p className="text-[11px] text-cyan-600 dark:text-cyan-300 font-medium">6 Options de discussion</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConvoForMenu(null)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of 6 Options */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => {
                  playUiTapSound();
                  const res = togglePinUserConversation(currentUser.id, selectedConvoForMenu.convo.id);
                  if (!res.success && res.message) {
                    alert(res.message);
                  }
                  setDataVersion((v) => v + 1);
                  setSelectedConvoForMenu(null);
                }}
                className={`w-full p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition border ${
                  pinnedIds.includes(selectedConvoForMenu.convo.id)
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-white/5'
                }`}
              >
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 shrink-0">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold truncate">
                    {pinnedIds.includes(selectedConvoForMenu.convo.id)
                      ? 'Détacher de la tête'
                      : 'Option 1 : Étoile (Maintenir en tête - Max 3)'}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                    Garde 3 discussions en tête même avec de nouveaux messages
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playHapticClickSound();
                  setConfirmDeleteConvoId(selectedConvoForMenu.convo.id);
                }}
                className="w-full p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition border bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/20"
              >
                <div className="p-2 rounded-xl bg-red-500/20 text-red-500 dark:text-red-400 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold truncate">Option 2 : Supprimer la discussion</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                    Supprime la conversation et tous ses messages
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playUiTapSound();
                  toggleArchiveUserConversation(currentUser.id, selectedConvoForMenu.convo.id);
                  setDataVersion((v) => v + 1);
                  setSelectedConvoForMenu(null);
                }}
                className={`w-full p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition border ${
                  archivedIds.includes(selectedConvoForMenu.convo.id)
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-white/5'
                }`}
              >
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0">
                  <Archive className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold truncate">
                    {archivedIds.includes(selectedConvoForMenu.convo.id)
                      ? 'Désarchiver la discussion'
                      : 'Option 3 : Archiver'}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                    Placer la discussion dans l'espace "Archivées"
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playUiTapSound();
                  toggleFavoriteUserConversation(currentUser.id, selectedConvoForMenu.convo.id);
                  setDataVersion((v) => v + 1);
                  setSelectedConvoForMenu(null);
                }}
                className={`w-full p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition border ${
                  favoriteIds.includes(selectedConvoForMenu.convo.id)
                    ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/40 hover:bg-pink-500/30'
                    : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-white/5'
                }`}
              >
                <div className="p-2 rounded-xl bg-pink-500/20 text-pink-500 dark:text-pink-400 shrink-0">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold truncate">
                    {favoriteIds.includes(selectedConvoForMenu.convo.id)
                      ? 'Retirer des favoris'
                      : 'Option 4 : Favoris'}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                    Ajouter cette discussion à vos favoris personnels
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playHapticClickSound();
                  setConfirmClearConvoId(selectedConvoForMenu.convo.id);
                }}
                className="w-full p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition border bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/20"
              >
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400 shrink-0">
                  <Eraser className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold truncate">Option 5 : Supprimer les messages</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                    Vider les messages en conservant la discussion
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playUiTapSound();
                  if (selectedConvoForMenu.participant && onStartCall) {
                    onStartCall(selectedConvoForMenu.participant, false);
                  }
                  setSelectedConvoForMenu(null);
                }}
                className="w-full p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition border bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
              >
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold truncate">Option 6 : Appel</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                    Lancer un appel audio normal directement
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Option 2 : Supprimer la discussion */}
      {confirmDeleteConvoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-black text-zinc-900 dark:text-white text-base">Supprimer la discussion ?</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Cette action supprimera définitivement la discussion ainsi que tous ses messages.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteConvoId(null)}
                className="flex-1 py-2.5 rounded-2xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/15 text-zinc-900 dark:text-white font-bold text-xs"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  playHapticClickSound();
                  await deleteEntireConversationFromDb(confirmDeleteConvoId);
                  setConfirmDeleteConvoId(null);
                  setSelectedConvoForMenu(null);
                  setDataVersion((v) => v + 1);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Option 5 : Supprimer les messages */}
      {confirmClearConvoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-black text-zinc-900 dark:text-white text-base">Supprimer les messages ?</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Tous les messages de cette discussion seront effacés. La discussion restera dans votre liste.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmClearConvoId(null)}
                className="flex-1 py-2.5 rounded-2xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/15 text-zinc-900 dark:text-white font-bold text-xs"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  playHapticClickSound();
                  await clearAllMessagesInConversationFromDb(confirmClearConvoId);
                  setConfirmClearConvoId(null);
                  setSelectedConvoForMenu(null);
                  setDataVersion((v) => v + 1);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
              >
                Vider les messages
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
