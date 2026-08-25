import { useState, useEffect, useRef, useMemo, ChangeEvent, FormEvent } from 'react';
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  Shield,
  Crown,
  Sparkles,
  Send,
  Mic,
  Square,
  Image as ImageIcon,
  UserPlus,
  Info,
  LogOut,
  X,
  Check,
  Globe,
  Lock,
  ChevronLeft,
  Share2,
  Copy,
  Flame,
  Music,
  Briefcase,
  HeartHandshake,
  Cpu,
  Trophy,
  Smile,
  Reply,
  CornerDownRight,
  UserCheck
} from 'lucide-react';
import { UserProfile, LisangaGroup, LisangaMessage, AppSettings, ChatMessageReply, Conversation } from '../types';
import {
  subscribeLisangaGroups,
  createLisangaGroupInDb,
  joinLisangaGroupInDb,
  leaveLisangaGroupInDb,
  subscribeLisangaMessages,
  sendLisangaMessageToDb,
  normalizeProfileTag,
  getContactDisplayName
} from '../services/dbService';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { compressImageFile } from '../utils/mediaUtils';

interface LisangaViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  conversations?: Conversation[];
  appSettings: AppSettings;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous les Groupes', icon: <Globe className="w-4 h-4" /> },
  { id: 'Communauté Officielle', label: 'Communauté', icon: <Crown className="w-4 h-4" /> },
  { id: 'Business & Affaires', label: 'Business', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'Musique & Culture', label: 'Musique & Art', icon: <Music className="w-4 h-4" /> },
  { id: 'Entraide & Solidarité', label: 'Entraide', icon: <HeartHandshake className="w-4 h-4" /> },
  { id: 'Technologie & Startups', label: 'Tech & Dev', icon: <Cpu className="w-4 h-4" /> },
  { id: 'Sports & Loisirs', label: 'Sports', icon: <Trophy className="w-4 h-4" /> },
];

export function LisangaView({ currentUser, allUsers, conversations = [], appSettings }: LisangaViewProps) {
  const [groups, setGroups] = useState<LisangaGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<LisangaGroup | null>(null);

  // Group creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Communauté Officielle');
  const [newGroupImage, setNewGroupImage] = useState('');
  const [newGroupRules, setNewGroupRules] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [createContactSearch, setCreateContactSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Group Details & Invite Modal
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [inviteTagInput, setInviteTagInput] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [infoContactSearch, setInfoContactSearch] = useState('');

  // Chat inside Active Group
  const [messages, setMessages] = useState<LisangaMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<LisangaMessage | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording
  const {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder();

  // Compute contacts with whom the current user communicates
  const userContacts = useMemo(() => {
    const contactIds = new Set<string>();
    conversations.forEach((c) => {
      if (!c.isGroup && c.participantIds && Array.isArray(c.participantIds)) {
        c.participantIds.forEach((pid) => {
          if (pid !== currentUser.id) {
            contactIds.add(pid);
          }
        });
      }
    });

    const directContacts = allUsers.filter(
      (u) => u.id !== currentUser.id && (contactIds.has(u.id) || (u.email && contactIds.has(u.email)))
    );

    // If user has direct contacts, prioritize them; else show other community users
    if (directContacts.length > 0) {
      return directContacts;
    }
    return allUsers.filter((u) => u.id !== currentUser.id);
  }, [conversations, allUsers, currentUser.id]);

  // Subscribe to all Lisanga groups
  useEffect(() => {
    const unsub = subscribeLisangaGroups((data) => {
      setGroups(data);
      // Keep active group updated
      if (activeGroup) {
        const updated = data.find(g => g.id === activeGroup.id);
        if (updated) setActiveGroup(updated);
      }
    });
    return () => unsub();
  }, [activeGroup?.id]);

  // Subscribe to messages in active group
  useEffect(() => {
    if (!activeGroup) return;
    const unsub = subscribeLisangaMessages(activeGroup.id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeGroup?.id]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachedMedia]);

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsCreating(true);
    const groupId = `lisanga_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const allInitialMembers = Array.from(new Set([currentUser.id, ...selectedMemberIds]));

    const newGroup: LisangaGroup = {
      id: groupId,
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || 'Groupe Lisanga sur my Wahou',
      imageUrl: newGroupImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
      category: newGroupCategory,
      isPrivate: newGroupPrivate,
      creatorId: currentUser.id,
      creatorName: currentUser.displayName,
      creatorTag: currentUser.profileTag,
      adminIds: [currentUser.id],
      memberIds: allInitialMembers,
      membersCount: allInitialMembers.length,
      rules: newGroupRules.trim() || 'Respect mutuel et bienveillance au sein du groupe Lisanga.',
      lastActivity: Date.now(),
      createdAt: Date.now(),
      isOfficial: currentUser.role === 'admin'
    };

    try {
      await createLisangaGroupInDb(newGroup);
      setIsCreating(false);
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupImage('');
      setSelectedMemberIds([]);
      setActiveGroup(newGroup);
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  const handleToggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllContacts = () => {
    setSelectedMemberIds(userContacts.map((c) => c.id));
  };

  const handleDeselectAllContacts = () => {
    setSelectedMemberIds([]);
  };

  const handleJoinGroup = async (group: LisangaGroup) => {
    await joinLisangaGroupInDb(group.id, currentUser.id);
    setActiveGroup(group);
  };

  const handleLeaveGroup = async (group: LisangaGroup) => {
    if (window.confirm(`Voulez-vous vraiment quitter le groupe "${group.name}" ?`)) {
      await leaveLisangaGroupInDb(group.id, currentUser.id);
      setActiveGroup(null);
      setShowGroupInfoModal(false);
    }
  };

  const handleAddDirectContactToActiveGroup = async (contact: UserProfile) => {
    if (!activeGroup) return;
    try {
      await joinLisangaGroupInDb(activeGroup.id, contact.id);
      setInviteFeedback({
        type: 'success',
        text: `🎉 ${contact.displayName} a été ajouté au groupe avec succès !`
      });
    } catch (err) {
      console.error('Error adding contact to group:', err);
      setInviteFeedback({
        type: 'error',
        text: `Impossible d'ajouter ${contact.displayName}. Veuillez réessayer.`
      });
    }
  };

  const getReplyPayload = (targetMsg: LisangaMessage | null): ChatMessageReply | undefined => {
    if (!targetMsg) return undefined;
    let contentPreview = targetMsg.content;
    if (targetMsg.type === 'voice') contentPreview = '🎤 Note vocale';
    if (targetMsg.type === 'image') contentPreview = '🖼️ Photo';
    if (targetMsg.type === 'video') contentPreview = '🎬 Vidéo';

    return {
      id: targetMsg.id,
      senderName: targetMsg.senderId === currentUser.id ? 'Vous' : targetMsg.senderName,
      senderTag: targetMsg.senderId === currentUser.id ? currentUser.profileTag : targetMsg.senderTag,
      content: contentPreview || 'Message',
      type: targetMsg.type,
      mediaUrl: targetMsg.mediaUrl
    };
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`lisanga-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-violet-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-violet-400');
      }, 1500);
    }
  };

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!activeGroup) return;

    if (!textInput.trim() && !attachedMedia && !recordingState.audioUrl) return;

    setIsSending(true);
    const contentToSend = textInput.trim();
    const mediaToSend = attachedMedia;
    const audioToSend = recordingState.audioUrl;
    const durationToSend = recordingState.duration;
    const replyPayload = getReplyPayload(replyingToMessage);

    // Optimistic UI state reset
    setTextInput('');
    setAttachedMedia(null);
    setReplyingToMessage(null);
    if (audioToSend) {
      cancelRecording();
    }

    const msgId = `lisanga_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: LisangaMessage = {
      id: msgId,
      groupId: activeGroup.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      senderTag: currentUser.profileTag,
      type: audioToSend ? 'voice' : mediaToSend ? mediaToSend.type : 'text',
      content: contentToSend,
      audioUrl: audioToSend || undefined,
      audioDuration: durationToSend || undefined,
      mediaUrl: mediaToSend?.url,
      mediaType: mediaToSend?.type,
      replyTo: replyPayload,
      timestamp: Date.now()
    };

    try {
      await sendLisangaMessageToDb(newMsg);
    } catch (err) {
      console.error('Error sending lisanga message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 800, 800, 0.85);
        setAttachedMedia({ url: compressed, type: 'image' });
      } catch (err) {
        console.error(err);
      }
    } else if (file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachedMedia({ url: reader.result, type: 'video' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGroupAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400, 400, 0.85);
      setNewGroupImage(compressed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteUserByTag = async () => {
    if (!activeGroup || !inviteTagInput.trim()) return;
    const cleanQuery = inviteTagInput.trim().toLowerCase();

    const targetUser = allUsers.find(
      u =>
        u.profileTag?.toLowerCase() === cleanQuery ||
        normalizeProfileTag(u.profileTag || '').toLowerCase() === normalizeProfileTag(cleanQuery).toLowerCase() ||
        u.email.toLowerCase() === cleanQuery ||
        u.displayName.toLowerCase() === cleanQuery
    );

    if (!targetUser) {
      setInviteFeedback({
        type: 'error',
        text: `Aucun utilisateur trouvé avec "${inviteTagInput}". Demandez-lui son tag #Tag@.`
      });
      return;
    }

    if (activeGroup.memberIds.includes(targetUser.id)) {
      setInviteFeedback({
        type: 'error',
        text: `${targetUser.displayName} est déjà membre de ce groupe Lisanga.`
      });
      return;
    }

    await joinLisangaGroupInDb(activeGroup.id, targetUser.id);
    setInviteFeedback({
      type: 'success',
      text: `🎉 ${targetUser.displayName} a été ajouté au groupe avec succès !`
    });
    setInviteTagInput('');
  };

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const matchCat = selectedCategory === 'all' || g.category === selectedCategory;
    const matchSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const isMemberOfActive = activeGroup && activeGroup.memberIds?.includes(currentUser.id);

  // Contacts filtering for group creation
  const filteredCreateContacts = userContacts.filter((c) => {
    if (!createContactSearch.trim()) return true;
    const q = createContactSearch.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      (c.profileTag && c.profileTag.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q)
    );
  });

  // Contacts filtering for group info invite
  const contactsNotInActiveGroup = userContacts.filter((c) => {
    if (!activeGroup) return false;
    const inGroup = activeGroup.memberIds?.includes(c.id) || (c.email && activeGroup.memberIds?.includes(c.email));
    if (inGroup) return false;
    if (!infoContactSearch.trim()) return true;
    const q = infoContactSearch.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      (c.profileTag && c.profileTag.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 h-full bg-zinc-950 flex flex-col md:flex-row overflow-hidden select-none">
      {/* LEFT COLUMN: GROUPS EXPLORER & LIST */}
      <div className={`w-full md:w-80 lg:w-96 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full shrink-0 ${activeGroup ? 'hidden md:flex' : 'flex'}`}>
        {/* Lisanga Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Lisanga</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold">
                  Groupes
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">Communautés & Discussions</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Créer</span>
          </button>
        </div>

        {/* Search Groups */}
        <div className="p-3 border-b border-zinc-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un groupe Lisanga..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          {/* Category Chips Carousel */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto custom-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-900 p-2 space-y-1">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-zinc-400">Aucun groupe trouvé</p>
              <p className="text-[10px] mt-1">Créez le premier groupe Lisanga dans cette catégorie !</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id;
              const isMember = group.memberIds?.includes(currentUser.id);

              return (
                <div
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className={`p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-950/70 to-purple-950/50 border border-violet-500/40 text-white shadow-lg'
                      : 'hover:bg-zinc-900/80 text-zinc-300'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={group.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100'}
                      alt={group.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-zinc-800 group-hover:border-violet-500 transition"
                    />
                    {group.isOfficial && (
                      <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-zinc-950 shadow">
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-bold text-sm text-white truncate">{group.name}</h4>
                      <span className="text-[10px] font-semibold text-zinc-400 shrink-0">
                        {group.membersCount || group.memberIds?.length || 1} m.
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate leading-relaxed">
                      {group.description}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        {group.category}
                      </span>
                      {isMember && (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          <span>Rejoint</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE GROUP CHAT OR EMPTY STATE */}
      <div className={`flex-1 flex flex-col h-full bg-zinc-950 ${!activeGroup ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeGroup ? (
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600/30 via-pink-600/30 to-amber-500/30 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto mb-4 shadow-xl">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Bienvenue dans l'Espace Lisanga</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Lisanga réunit vos cercles, vos communautés, vos projets professionnels et vos centres d'intérêt. Rejoignez un groupe ou créez le vôtre en quelques secondes !
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-violet-600/30 hover:scale-105 transition"
            >
              Créer un Nouveau Groupe Lisanga
            </button>
          </div>
        ) : (
          <>
            {/* Active Group Header */}
            <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveGroup(null)}
                  className="md:hidden p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => setShowGroupInfoModal(true)}
                  className="relative cursor-pointer hover:opacity-90 transition shrink-0"
                >
                  <img
                    src={activeGroup.imageUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100'}
                    alt={activeGroup.name}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border border-zinc-800"
                  />
                  {activeGroup.isOfficial && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-500 text-zinc-950 shadow">
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div
                  onClick={() => setShowGroupInfoModal(true)}
                  className="cursor-pointer min-w-0"
                >
                  <h3 className="font-bold text-sm sm:text-base text-white truncate flex items-center gap-1.5">
                    <span>{activeGroup.name}</span>
                    {activeGroup.isPrivate && <Lock className="w-3.5 h-3.5 text-zinc-400" />}
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate flex items-center gap-2">
                    <span>{activeGroup.memberIds?.length || 1} membre(s)</span>
                    <span>•</span>
                    <span className="text-violet-400 font-semibold">{activeGroup.category}</span>
                  </p>
                </div>
              </div>

              {/* Group Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {!isMemberOfActive ? (
                  <button
                    onClick={() => handleJoinGroup(activeGroup)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-md transition"
                  >
                    Rejoindre Lisanga
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowGroupInfoModal(true)}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <UserPlus className="w-4 h-4 text-violet-400" />
                      <span className="hidden sm:inline">Inviter / Infos</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Flow */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-zinc-950/70">
              {/* Group Welcome Card */}
              <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center max-w-xl mx-auto mb-4">
                <img
                  src={activeGroup.imageUrl}
                  alt={activeGroup.name}
                  className="w-16 h-16 rounded-3xl object-cover mx-auto mb-3 border-2 border-violet-500/50 shadow-lg"
                />
                <h4 className="font-black text-base text-white mb-1">{activeGroup.name}</h4>
                <p className="text-xs text-zinc-300 leading-relaxed mb-3">{activeGroup.description}</p>
                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400">
                  📜 <strong>Règles du groupe :</strong> {activeGroup.rules || 'Respect et bienveillance mutuelle.'}
                </div>
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    id={`lisanga-msg-${msg.id}`}
                    className={`flex items-start gap-2.5 group relative transition-all rounded-2xl p-1 ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {!isMe && (
                      <img
                        src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-800 shrink-0 mt-1"
                      />
                    )}

                    <div className={`max-w-[80%] sm:max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-bold text-violet-300">{msg.senderName}</span>
                          {msg.senderTag && (
                            <span className="font-mono text-[9px] text-zinc-400">{msg.senderTag}</span>
                          )}
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed relative ${
                          isMe
                            ? 'bg-gradient-to-br from-violet-600 to-pink-600 text-white rounded-tr-none shadow-md shadow-violet-600/20'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
                        }`}
                      >
                        {/* Quoted Message */}
                        {msg.replyTo && (
                          <div
                            onClick={() => scrollToMessage(msg.replyTo!.id)}
                            className={`mb-2 p-2 rounded-xl border-l-4 text-xs cursor-pointer select-none transition ${
                              isMe
                                ? 'border-violet-200 bg-violet-950/70 hover:bg-violet-950 text-violet-100'
                                : 'border-violet-500 bg-zinc-950/80 hover:bg-zinc-950 text-zinc-300'
                            }`}
                            title="Cliquer pour voir le message d'origine"
                          >
                            <div className="flex items-center gap-1 font-bold text-[11px] text-violet-300 mb-0.5">
                              <CornerDownRight className="w-3 h-3 shrink-0" />
                              <span className="truncate">{msg.replyTo.senderName}</span>
                            </div>
                            <p className="line-clamp-2 text-[11px] opacity-90 italic">
                              {msg.replyTo.content}
                            </p>
                          </div>
                        )}

                        {/* Voice Note */}
                        {msg.type === 'voice' && msg.audioUrl && (
                          <div className="my-1">
                            <AudioPlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
                          </div>
                        )}

                        {/* Image / Video */}
                        {msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden bg-black border border-white/10">
                            {msg.mediaType === 'video' ? (
                              <video src={msg.mediaUrl} controls className="max-h-60 w-full object-cover" />
                            ) : (
                              <img src={msg.mediaUrl} alt="Media" className="max-h-60 w-full object-cover" />
                            )}
                          </div>
                        )}

                        {/* Text content */}
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                        <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-violet-200' : 'text-zinc-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Quick Reply Button on Hover */}
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition flex items-center gap-1 self-center ${
                        isMe ? 'mr-1' : 'ml-1'
                      }`}
                    >
                      <button
                        onClick={() => setReplyingToMessage(msg)}
                        className="p-1.5 rounded-full bg-zinc-800/90 hover:bg-violet-900 border border-zinc-700 text-zinc-300 hover:text-white transition shadow-sm"
                        title="Répondre à ce message"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar (Only if member) */}
            {isMemberOfActive ? (
              <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                {/* Active Reply Banner */}
                {replyingToMessage && (
                  <div className="mb-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-violet-950/90 to-zinc-900 border border-violet-500/40 flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-xl bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-violet-400 shrink-0">
                        <Reply className="w-3.5 h-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-violet-300 flex items-center gap-1">
                          <span>Réponse à {replyingToMessage.senderId === currentUser.id ? 'Vous-même' : replyingToMessage.senderName}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate italic">
                          {replyingToMessage.type === 'voice' && '🎤 Note vocale'}
                          {replyingToMessage.type === 'image' && '🖼️ Photo'}
                          {replyingToMessage.type === 'video' && '🎬 Vidéo'}
                          {replyingToMessage.type === 'text' && replyingToMessage.content}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyingToMessage(null)}
                      className="p-1.5 rounded-xl hover:bg-violet-900/60 text-zinc-400 hover:text-white transition shrink-0"
                      title="Annuler la réponse"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {/* Pending Media Preview */}
                {attachedMedia && (
                  <div className="mb-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 max-w-xs">
                    <img src={attachedMedia.url} alt="Attach" className="w-12 h-12 rounded-lg object-cover" />
                    <span className="text-xs text-zinc-300 truncate">Pièce jointe prête</span>
                    <button
                      onClick={() => setAttachedMedia(null)}
                      className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Audio recording preview */}
                {recordingState.isRecording ? (
                  <div className="flex items-center justify-between bg-red-950/60 border border-red-500/40 rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold text-red-300">
                        Enregistrement vocal Lisanga... ({recordingState.duration}s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelRecording}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={stopRecording}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Square className="w-3 h-3" />
                        <span>Terminer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-violet-400 transition shrink-0"
                      title="Photo / Vidéo"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-pink-400 transition shrink-0"
                      title="Enregistrer une note vocale"
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Message au groupe Lisanga..."
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                    />

                    <button
                      type="submit"
                      disabled={isSending || (!textInput.trim() && !attachedMedia && !recordingState.audioUrl)}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold transition disabled:opacity-40 shrink-0 shadow-md shadow-violet-600/30"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-center">
                <p className="text-xs text-zinc-400 mb-2">Rejoignez ce groupe Lisanga pour participer aux discussions.</p>
                <button
                  onClick={() => handleJoinGroup(activeGroup)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-md"
                >
                  Rejoindre le Groupe Lisanga
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: CREATE NEW LISANGA GROUP */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-white">Créer un Groupe Lisanga</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Nom du Groupe Lisanga *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ex: Lisanga Entrepreneurs RDC"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Description & Objectif *
                </label>
                <textarea
                  rows={2}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Décrivez en quelques mots la thématique du groupe..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Catégorie
                  </label>
                  <select
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Communauté Officielle">Communauté Officielle</option>
                    <option value="Business & Affaires">Business & Affaires</option>
                    <option value="Musique & Culture">Musique & Culture</option>
                    <option value="Entraide & Solidarité">Entraide & Solidarité</option>
                    <option value="Technologie & Startups">Technologie & Startups</option>
                    <option value="Sports & Loisirs">Sports & Loisirs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Confidentialité
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setNewGroupPrivate(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        !newGroupPrivate ? 'bg-violet-600 text-white' : 'bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroupPrivate(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        newGroupPrivate ? 'bg-violet-600 text-white' : 'bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Privé</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Group Cover / Avatar Image */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Photo du Groupe Lisanga
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleGroupAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 shrink-0"
                  >
                    <ImageIcon className="w-4 h-4 text-violet-400" />
                    <span>Choisir image</span>
                  </button>

                  <input
                    type="text"
                    value={newGroupImage}
                    onChange={(e) => setNewGroupImage(e.target.value)}
                    placeholder="Ou collez une URL d'image..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* CONTACT PICKER: Add contacts with whom the user communicates */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold text-white">Ajouter vos contacts au groupe</span>
                  </div>
                  {selectedMemberIds.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 font-bold text-[10px]">
                      {selectedMemberIds.length} sélectionné(s)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={createContactSearch}
                      onChange={(e) => setCreateContactSearch(e.target.value)}
                      placeholder="Filtrer vos contacts..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  {userContacts.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllContacts}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold"
                      >
                        Tout
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllContacts}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold"
                      >
                        Aucun
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {filteredCreateContacts.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-2">
                      Aucun contact trouvé.
                    </p>
                  ) : (
                    filteredCreateContacts.map((contact) => {
                      const isSelected = selectedMemberIds.includes(contact.id);
                      return (
                        <div
                          key={contact.id}
                          onClick={() => handleToggleMemberSelection(contact.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition ${
                            isSelected
                              ? 'bg-violet-950/50 border-violet-500/60 text-white'
                              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={contact.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={contact.displayName}
                              className="w-7 h-7 rounded-full object-cover border border-zinc-800 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-xs truncate">{contact.displayName}</p>
                              {contact.profileTag && (
                                <p className="font-mono text-[9px] text-zinc-400 truncate">{contact.profileTag}</p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                              isSelected
                                ? 'bg-violet-600 text-white shadow'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Règles & Charte de convivialité
                </label>
                <input
                  type="text"
                  value={newGroupRules}
                  onChange={(e) => setNewGroupRules(e.target.value)}
                  placeholder="Ex: Pas de spam, entraide et politesse obligatoires"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating || !newGroupName.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-black text-sm shadow-xl shadow-violet-600/30 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Création en cours...' : `Créer le Groupe Lisanga ${selectedMemberIds.length > 0 ? `(${selectedMemberIds.length + 1} membres)` : ''}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GROUP DETAILS & INVITE MEMBERS */}
      {showGroupInfoModal && activeGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white">Détails du Groupe Lisanga</h3>
              <button
                onClick={() => setShowGroupInfoModal(false)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <img
                src={activeGroup.imageUrl}
                alt={activeGroup.name}
                className="w-20 h-20 rounded-3xl object-cover mx-auto mb-3 border-2 border-violet-500/50 shadow-xl"
              />
              <h4 className="font-black text-lg text-white mb-0.5">{activeGroup.name}</h4>
              <p className="text-xs text-violet-400 font-bold mb-2">{activeGroup.category}</p>
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-left">
                {activeGroup.description}
              </p>
            </div>

            {/* Instant Contact Invitation (1-Click) */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-violet-300 font-bold text-xs">
                  <UserPlus className="w-4 h-4 text-violet-400" />
                  <span>Ajouter vos contacts au groupe</span>
                </div>
                <span className="text-[10px] text-zinc-500">1 clic</span>
              </div>

              {contactsNotInActiveGroup.length > 0 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={infoContactSearch}
                    onChange={(e) => setInfoContactSearch(e.target.value)}
                    placeholder="Chercher un contact à ajouter..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}

              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {contactsNotInActiveGroup.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    Tous vos contacts font déjà partie de ce groupe !
                  </p>
                ) : (
                  contactsNotInActiveGroup.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={contact.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={contact.displayName}
                          className="w-7 h-7 rounded-full object-cover border border-zinc-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate">{contact.displayName}</p>
                          {contact.profileTag && (
                            <p className="font-mono text-[9px] text-zinc-400 truncate">{contact.profileTag}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddDirectContactToActiveGroup(contact)}
                        className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1 transition shadow shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Invite a member with tag */}
            <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30 space-y-3">
              <div className="flex items-center gap-2 text-violet-300 font-bold text-xs">
                <UserCheck className="w-4 h-4" />
                <span>Ou ajouter par identifiant unique (#Tag@)</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteTagInput}
                  onChange={(e) => setInviteTagInput(e.target.value)}
                  placeholder="Ex: #Spart20@ ou email..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleInviteUserByTag}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow transition shrink-0"
                >
                  Ajouter
                </button>
              </div>

              {inviteFeedback && (
                <p className={`text-xs font-semibold ${inviteFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {inviteFeedback.text}
                </p>
              )}
            </div>

            {/* Members List */}
            <div>
              <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Membres Actuels ({activeGroup.memberIds?.length || 1})
              </h5>

              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {activeGroup.memberIds?.map((memberId) => {
                  const member = allUsers.find(u => u.id === memberId || u.email?.toLowerCase() === memberId.toLowerCase());
                  const isCreator = memberId === activeGroup.creatorId;
                  const memberName = getContactDisplayName(member, null, memberId);

                  return (
                    <div
                      key={memberId}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={member?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={memberName}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate">{memberName}</p>
                          {member?.profileTag && (
                            <p className="font-mono text-[9px] text-zinc-400 truncate">{member.profileTag}</p>
                          )}
                        </div>
                      </div>

                      {isCreator ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                          Créateur
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-medium">Membre</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Group Action */}
            {isMemberOfActive && (
              <div className="pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleLeaveGroup(activeGroup)}
                  className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Quitter ce groupe Lisanga</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
