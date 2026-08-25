import { useState } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Crown,
  Shield,
  Image,
  PhoneCall,
  Settings,
  Share2,
  Zap,
  Server,
  Radio,
  Users,
  Building2
} from 'lucide-react';
import { UserProfile, Conversation, AppSettings } from '../types';
import { ADMIN_EMAIL, getContactDisplayName } from '../services/dbService';

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
  onOpenForfaitModal,
  onOpenProfileModal,
  onOpenAdminModal,
  onOpenWebLink,
  onOpenJourneeLive,
  onOpenLisanga,
  onOpenEntreprise,
  appSettings,
}: SidebarProps) {
  const [searchFilter, setSearchFilter] = useState('');

  // Find other participant in 1-on-1 convo
  const getConvoParticipant = (convo: Conversation): UserProfile | undefined => {
    const otherId = convo.participantIds?.find(id => id !== currentUser.id);
    if (!otherId) return undefined;

    // 1. Direct ID match
    let found = allUsers.find(u => u.id === otherId);
    if (found) return found;

    // 2. Email or case-insensitive ID match
    found = allUsers.find(
      u => u.email?.toLowerCase() === otherId.toLowerCase() || u.id.toLowerCase() === otherId.toLowerCase()
    );
    if (found) return found;

    return undefined;
  };

  const filteredConversations = conversations.filter((convo) => {
    const otherId = convo.participantIds?.find(id => id !== currentUser.id);
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

  // Only display contacts who are part of existing discussions to prevent unsearched exposure
  const activeDiscussionPartners = conversations
    .map(c => getConvoParticipant(c))
    .filter((u): u is UserProfile => Boolean(u && !u.isBlocked));

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

          {/* Quick Admin Access Button ONLY for wasoluachristian@gmail.com */}
          {currentUser.role === 'admin' && currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
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

      {/* User Balance Header Pill */}
      <div className="px-4 py-3 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center justify-between">
        <div
          onClick={onOpenProfileModal}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition group"
        >
          <div className="relative">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={currentUser.displayName}
              className="w-9 h-9 rounded-full object-cover border-2 border-violet-500/80"
            />
            {currentUser.isVIP && (
              <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-500 text-zinc-950">
                <Crown className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1 group-hover:text-violet-300">
              <span>{currentUser.displayName}</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              {currentUser.isVIP ? 'VIP Illimité' : `${currentUser.mediaQuota || 0} médias • ${currentUser.callMinutes || 0} min`}
            </div>
          </div>
        </div>

        {/* Forfaits Boutique Button */}
        <button
          id="open-forfaits-sidebar-btn"
          onClick={onOpenForfaitModal}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/20 transition active:scale-95"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Forfaits</span>
        </button>
      </div>

      {/* Quick Access Carousel: Journée Live & Active Discussions */}
      <div className="p-3 border-b border-zinc-800/60 overflow-x-auto scrollbar-none flex items-center gap-3 bg-zinc-950">
        {/* Journée Live shortcut button */}
        {onOpenJourneeLive && (
          <div
            onClick={onOpenJourneeLive}
            className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
            title="Journée Live (Stories 24h)"
          >
            <div className="w-12 h-12 rounded-full p-0.5 ring-2 ring-pink-500 bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[10px] font-bold text-pink-400">Live 24h</span>
          </div>
        )}

        {/* Lisanga Groupes shortcut button */}
        {onOpenLisanga && (
          <div
            onClick={onOpenLisanga}
            className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
            title="Groupes Lisanga"
          >
            <div className="w-12 h-12 rounded-full p-0.5 ring-2 ring-violet-500 bg-gradient-to-tr from-violet-700 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-violet-400">Lisanga</span>
          </div>
        )}

        {/* Espace Entreprise shortcut button */}
        {onOpenEntreprise && (
          <div
            onClick={onOpenEntreprise}
            className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
            title="Espace Entreprise & Pubs"
          >
            <div className="w-12 h-12 rounded-full p-0.5 ring-2 ring-amber-500/80 bg-gradient-to-tr from-amber-600 to-pink-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-400">Pubs</span>
          </div>
        )}

        {/* Add new conversation button */}
        <div
          onClick={onOpenNewChat}
          className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-violet-500 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 transition bg-zinc-900">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-zinc-400">Rechercher</span>
        </div>

        {/* Active direct discussions */}
        {activeDiscussionPartners.slice(0, 6).map((user) => {
          const contactName = getContactDisplayName(user);
          return (
            <div
              key={user.id}
              onClick={() => onSelectConversation(`direct_${[currentUser.id, user.id].sort().join('_')}`, user)}
              className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
            >
              <div className="relative">
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={contactName}
                  className="w-12 h-12 rounded-full object-cover p-0.5 ring-2 ring-violet-500/80 group-hover:ring-pink-500 transition"
                />
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                )}
              </div>
              <span className="text-[10px] font-medium text-zinc-300 max-w-[56px] truncate">
                {contactName.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Search Conversations */}
      <div className="p-3 border-b border-zinc-800/60">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Rechercher une discussion..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Aucune discussion active</p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 text-xs text-violet-400 font-bold hover:underline"
            >
              Démarrer un premier échange gratuit
            </button>
          </div>
        ) : (
          filteredConversations.map((convo) => {
            const otherId = convo.participantIds?.find(id => id !== currentUser.id);
            const participant = getConvoParticipant(convo);
            const isSelected = activeConversationId === convo.id;
            const displayName = getContactDisplayName(participant, convo, otherId);
            const avatarUrl = convo.avatarUrl || participant?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

            return (
              <div
                key={convo.id}
                id={`convo-item-${convo.id}`}
                onClick={() => onSelectConversation(convo.id, participant)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition relative ${
                  isSelected
                    ? 'bg-violet-950/30 border-l-4 border-violet-500'
                    : 'hover:bg-zinc-900/50'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-2xl object-cover border border-zinc-800"
                  />
                  {participant?.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                      <span>{displayName}</span>
                      {participant?.isVIP && (
                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                    </h4>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {formatTimestamp(convo.lastMessage?.timestamp || convo.updatedAt)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                    {convo.lastMessage?.type === 'voice' && (
                      <span className="text-violet-400 font-semibold flex items-center gap-1">
                        🎤 Note vocale
                      </span>
                    )}
                    {convo.lastMessage?.type === 'image' && (
                      <span className="text-pink-400 font-semibold flex items-center gap-1">
                        <Image className="w-3 h-3" /> Photo
                      </span>
                    )}
                    {convo.lastMessage?.type === 'call_log' && (
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" /> Appel
                      </span>
                    )}
                    {convo.lastMessage?.type === 'text' && convo.lastMessage.text}
                    {!convo.lastMessage && 'Démarrer la discussion'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info & Developer Signature */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <button
            onClick={onOpenWebLink}
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-semibold transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Partage</span>
          </button>

          <button
            onClick={onOpenProfileModal}
            className="text-zinc-400 hover:text-white transition flex items-center gap-1"
          >
            <Settings className="w-3 h-3" /> Paramètres
          </button>
        </div>

        {/* Official Developer Signature */}
        <div className="text-center text-[10px] text-zinc-500 border-t border-zinc-900/80 pt-1.5">
          <span className="font-semibold text-violet-400/90">développer part wastus spart 2026</span>
        </div>
      </div>
    </aside>
  );
}
