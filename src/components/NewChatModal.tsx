import { useState } from 'react';
import { Search, UserPlus, X, MessageSquare, Hash, ShieldCheck, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { ADMIN_EMAIL, normalizeProfileTag, getContactDisplayName } from '../services/dbService';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
}

export function NewChatModal({
  isOpen,
  onClose,
  allUsers,
  currentUser,
  onSelectUser,
}: NewChatModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const isCurrentUserAdmin = currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const handleCopyMyTag = () => {
    if (currentUser.profileTag) {
      navigator.clipboard.writeText(currentUser.profileTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Find users only when search term is entered
  const cleanSearch = searchTerm.trim();
  const normalizedQuery = normalizeProfileTag(cleanSearch).toLowerCase();

  const matchedUsers = cleanSearch
    ? allUsers.filter((u) => {
        if (u.id === currentUser.id) return false;
        if (u.isBlocked) return false;

        // Hide admin from normal users unless searched with admin's exact tag or admin is searching
        if (!isCurrentUserAdmin && (u.role === 'admin' || u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
          const userTagLower = (u.profileTag || '').toLowerCase();
          if (normalizedQuery !== userTagLower && !u.displayName.toLowerCase().includes(cleanSearch.toLowerCase())) {
            return false;
          }
        }

        const userTagLower = (u.profileTag || '').toLowerCase();
        const userTagClean = userTagLower.replace(/^#+/, '').replace(/@+$/, '');
        const queryClean = cleanSearch.toLowerCase().replace(/^#+/, '').replace(/@+$/, '');

        // Match by tag, display name, or email search
        const tagMatches =
          (normalizedQuery && userTagLower === normalizedQuery) ||
          (queryClean.length >= 2 && userTagClean.includes(queryClean));

        const nameMatches = u.displayName.toLowerCase().includes(queryClean);
        const emailMatches = u.email.toLowerCase().includes(queryClean);

        return tagMatches || nameMatches || emailMatches;
      })
    : [];

  return (
    <div
      id="new-chat-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="new-chat-container"
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Nouvelle Discussion</h2>
              <p className="text-xs text-zinc-400">Trouver un contact par son identifiant unique</p>
            </div>
          </div>
          <button
            id="close-new-chat-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User's Own Unique Tag Share Card */}
        <div className="my-3 p-3 rounded-2xl bg-violet-950/40 border border-violet-500/30 text-xs shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-zinc-400 block text-[11px]">Votre identifiant unique de profil :</span>
              <span className="font-mono font-bold text-violet-300 text-sm tracking-wide">
                {currentUser.profileTag || '#MonProfil@'}
              </span>
            </div>
            <button
              id="copy-my-tag-btn"
              onClick={handleCopyMyTag}
              className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white font-medium text-xs flex items-center gap-1.5 transition active:scale-95 border border-violet-500/40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-3 shrink-0">
          <Hash className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="new-chat-search-tag-input"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setHasSearched(true);
            }}
            placeholder="Tapez l'identifiant exact (ex: #Spart20@)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-500 transition"
          />
        </div>

        {/* Content View */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1 min-h-[180px]">
          {!cleanSearch ? (
            /* Privacy Empty State - No public list */
            <div className="text-center py-6 px-4 flex flex-col items-center justify-center text-zinc-400">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-violet-400 mb-3 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Recherche Privée & Sécurisée</h3>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Les nouveaux comptes ne sont pas affichés publiquement pour protéger la vie privée. Entrez l'identifiant exact (ex: <strong className="text-violet-300">#Spart20@</strong>) de la personne que vous souhaitez contacter.
              </p>
            </div>
          ) : matchedUsers.length === 0 ? (
            /* No user found state */
            <div className="text-center py-8 px-4 flex flex-col items-center justify-center text-zinc-400">
              <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Aucun utilisateur trouvé</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Aucun compte ne correspond à <span className="font-mono text-zinc-300">"{cleanSearch}"</span>. Vérifiez l'orthographe du tag avec votre contact.
              </p>
            </div>
          ) : (
            /* Matched user card */
            matchedUsers.map((user) => (
              <div
                key={user.id}
                id={`user-search-card-${user.id}`}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-zinc-900/80 hover:bg-violet-950/40 border border-zinc-800 hover:border-violet-500/40 cursor-pointer flex items-center justify-between transition group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full object-cover border border-violet-500/30"
                    />
                    {user.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {getContactDisplayName(user)}
                      {user.isVIP && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-violet-400 mt-0.5">
                      {user.profileTag || '#Profil@'}
                    </div>
                    {user.statusText && (
                      <div className="text-[11px] text-zinc-400 italic mt-0.5">{user.statusText}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition shadow-md shadow-violet-600/30">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Discuter</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

