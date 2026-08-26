import { useState } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Shield,
  Share2,
  Check,
  CheckCheck
} from 'lucide-react';
import { UserProfile, Conversation, AppSettings } from '../types';
import { ADMIN_EMAIL, getContactDisplayName } from '../services/dbService';
import { UserAvatar } from './UserAvatar';

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
  appSettings: AppSettings;
}

export function Sidebar({
  currentUser,
  conversations,
  allUsers,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenAdminModal,
  onOpenWebLink,
  appSettings,
}: SidebarProps) {
  const [searchFilter, setSearchFilter] = useState('');

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

  const filteredConversations = conversations.filter((convo) => {
    const otherId = convo.participantIds?.find((id) => id !== currentUser.id);
    const participant = getConvoParticipant(convo);
    const name = getContactDisplayName(participant, convo, otherId);
    const email = participant?.email || '';
    const tag = participant?.profileTag || '';
    const query = searchFilter.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      tag.toLowerCase().includes(query)
    );
  });

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
      className="w-full md:w-80 lg:w-96 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full select-none"
    >
      {/* App Header & Branding */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {appSettings.logoUrl ? (
            <img
              src={appSettings.logoUrl}
              alt="Logo my Wahou"
              className="w-10 h-10 rounded-2xl object-cover border border-violet-500 shadow-md shadow-violet-500/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <MessageSquare className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight text-white">
                {appSettings.appName || 'my Wahou'}
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-black uppercase bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950">
                Gratuit
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Texte & Vocaux 100% sans forfait
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Share button */}
          <button
            id="sidebar-weblink-btn"
            onClick={onOpenWebLink}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition flex items-center gap-1 text-xs font-semibold"
            title="Partage de l'application"
          >
            <Share2 className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Partage</span>
          </button>

          {/* Admin shortcut */}
          {currentUser.role === 'admin' &&
            currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
              <button
                id="admin-top-shortcut-btn"
                onClick={onOpenAdminModal}
                className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1 text-xs font-bold"
                title="Espace Administrateur"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
        </div>
      </div>

      {/* Search & New Chat Action */}
      <div className="p-3 border-b border-zinc-800/80 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="sidebar-search-input"
            type="text"
            placeholder="Rechercher une discussion..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        <button
          id="sidebar-start-new-chat-btn"
          onClick={onOpenNewChat}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Discussion</span>
        </button>
      </div>

      {/* Conversations List */}
      <div
        id="conversations-list"
        className="flex-1 overflow-y-auto divide-y divide-zinc-900"
      >
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-zinc-500 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs text-zinc-400">
              {searchFilter ? 'Aucune discussion trouvée.' : 'Aucune discussion en cours.'}
            </p>
            <button
              onClick={onOpenNewChat}
              className="text-xs text-violet-400 hover:text-pink-400 font-semibold underline"
            >
              Démarrer une conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((convo) => {
            const isActive = activeConversationId === convo.id;
            const otherId = convo.participantIds?.find((id) => id !== currentUser.id);
            const participant = getConvoParticipant(convo);
            const contactName = getContactDisplayName(participant, convo, otherId);
            const unread = convo.unreadCount?.[currentUser.id] || 0;
            const hasUnread = unread > 0;
            const isSelfLast = convo.lastMessage?.senderId === currentUser.id;

            return (
              <div
                key={convo.id}
                id={`convo-item-${convo.id}`}
                onClick={() => onSelectConversation(convo.id, participant)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-zinc-900/40 border-l-4 border-violet-500'
                    : 'hover:bg-zinc-900/60'
                }`}
              >
                {/* Contact Avatar */}
                <UserAvatar
                  name={contactName}
                  avatarUrl={participant?.avatarUrl || convo.avatarUrl}
                  size="md"
                  isOnline={participant?.isOnline}
                  showOnlineStatus={true}
                  isVIP={participant?.isVIP}
                />

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`text-sm truncate ${
                          hasUnread ? 'font-black text-white' : 'font-semibold text-zinc-200'
                        }`}
                      >
                        {contactName}
                      </span>
                      {participant?.profileTag && (
                        <span className="font-mono text-[10px] text-violet-400 font-bold">
                          {participant.profileTag}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
                      {formatTimestamp(convo.updatedAt || convo.lastMessage?.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate flex items-center gap-1 ${
                        hasUnread ? 'font-bold text-violet-300' : 'text-zinc-400'
                      }`}
                    >
                      {isSelfLast && (
                        <span className="inline-block shrink-0">
                          {convo.lastMessage?.isRead ? (
                            <CheckCheck className="w-3 h-3 text-cyan-400 inline" />
                          ) : (
                            <Check className="w-3 h-3 text-zinc-400 inline" />
                          )}
                        </span>
                      )}
                      <span className="truncate">
                        {convo.lastMessage?.text || 'Commencer la discussion...'}
                      </span>
                    </p>

                    {/* Unread badge */}
                    {hasUnread && (
                      <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-md animate-pulse">
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
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2 truncate">
          <UserAvatar
            name={currentUser.displayName}
            avatarUrl={currentUser.avatarUrl}
            size="sm"
          />
          <div className="truncate">
            <div className="font-bold text-white truncate">{currentUser.displayName}</div>
            <div className="text-[10px] text-zinc-400 font-mono">{currentUser.profileTag}</div>
          </div>
        </div>

        <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Connecté
        </span>
      </div>
    </aside>
  );
}
