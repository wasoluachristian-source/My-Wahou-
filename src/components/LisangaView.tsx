import { useState, useEffect, useRef, useMemo, ChangeEvent, FormEvent } from 'react';
import {
  Users,
  Plus,
  Search,
  Shield,
  Crown,
  Send,
  Mic,
  Square,
  Image as ImageIcon,
  UserPlus,
  LogOut,
  X,
  Check,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Music,
  Briefcase,
  HeartHandshake,
  Cpu,
  Trophy,
  Reply,
  CornerDownRight,
  UserCheck,
  ArrowDown,
  ArrowLeft,
  Trash2,
  UserMinus
} from 'lucide-react';
import { UserProfile, LisangaGroup, LisangaMessage, AppSettings, ChatMessageReply, Conversation } from '../types';
import {
  subscribeLisangaGroups,
  createLisangaGroupInDb,
  joinLisangaGroupInDb,
  leaveLisangaGroupInDb,
  subscribeLisangaMessages,
  sendLisangaMessageToDb,
  toggleGroupDiscussionClosedForMembersInDb,
  toggleGroupAdminInDb,
  removeMemberFromLisangaGroupInDb,
  normalizeProfileTag,
  getContactDisplayName
} from '../services/dbService';
import { UserAvatar } from './UserAvatar';
import { BrandBirdLogo } from './BrandBirdLogo';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { compressImageFile } from '../utils/mediaUtils';
import { playMessageSentSound } from '../utils/soundUtils';

interface LisangaViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  conversations?: Conversation[];
  appSettings: AppSettings;
  onActiveGroupChange?: (isActive: boolean) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Mes Groupes', icon: <Globe className="w-4 h-4" /> },
  { id: 'Groupe Privé', label: 'Groupe Privé', icon: <Lock className="w-4 h-4" /> },
  { id: 'Communauté Officielle', label: 'Communauté', icon: <Crown className="w-4 h-4" /> },
  { id: 'Business & Affaires', label: 'Business', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'Musique & Culture', label: 'Musique & Art', icon: <Music className="w-4 h-4" /> },
  { id: 'Entraide & Solidarité', label: 'Entraide', icon: <HeartHandshake className="w-4 h-4" /> },
  { id: 'Technologie & Startups', label: 'Tech & Dev', icon: <Cpu className="w-4 h-4" /> },
  { id: 'Sports & Loisirs', label: 'Sports', icon: <Trophy className="w-4 h-4" /> },
];

export function LisangaView({
  currentUser,
  allUsers,
  conversations = [],
  onActiveGroupChange,
}: LisangaViewProps) {
  const [groups, setGroups] = useState<LisangaGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<LisangaGroup | null>(null);

  // Step-by-step group creation wizard state (Steps 1 -> 2 -> 3)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Communauté Officielle');
  const [newGroupImage, setNewGroupImage] = useState('');
  const [newGroupRules, setNewGroupRules] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [newGroupClosedForMembers, setNewGroupClosedForMembers] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedInitialAdminIds, setSelectedInitialAdminIds] = useState<string[]>([]);
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

  // Auto-scroll & down-arrow jump controls
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const prevGroupIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Notify App.tsx when inside an active group chat so bottom bar hides completely
  useEffect(() => {
    onActiveGroupChange?.(Boolean(activeGroup));
  }, [activeGroup, onActiveGroupChange]);

  useEffect(() => {
    return () => {
      onActiveGroupChange?.(false);
    };
  }, [onActiveGroupChange]);

  // Helper: check strict group membership (creator or added in memberIds)
  const isUserMemberOfGroup = (group: LisangaGroup) => {
    const emailLower = currentUser.email?.toLowerCase();
    return (
      group.creatorId === currentUser.id ||
      Boolean(group.memberIds?.includes(currentUser.id)) ||
      Boolean(emailLower && group.memberIds?.some((id) => id.toLowerCase() === emailLower))
    );
  };

  // Compute user contacts
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

    if (directContacts.length > 0) {
      return directContacts;
    }
    return allUsers.filter((u) => u.id !== currentUser.id);
  }, [conversations, allUsers, currentUser.id]);

  // Subscribe to Lisanga groups from Firestore
  useEffect(() => {
    const unsub = subscribeLisangaGroups((data) => {
      setGroups(data);
      setActiveGroup((prev) => {
        if (!prev) return null;
        const updated = data.find((g) => g.id === prev.id);
        if (!updated) return null;
        // If user was removed from the group while inside, exit the chat
        const stillMember =
          updated.creatorId === currentUser.id ||
          Boolean(updated.memberIds?.includes(currentUser.id)) ||
          Boolean(currentUser.email && updated.memberIds?.some((id) => id.toLowerCase() === currentUser.email.toLowerCase()));
        return stillMember ? updated : null;
      });
    });
    return () => unsub();
  }, [currentUser.id, currentUser.email]);

  // Subscribe to messages in active group
  useEffect(() => {
    if (!activeGroup) {
      setMessages([]);
      return;
    }
    const unsub = subscribeLisangaMessages(activeGroup.id, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeGroup?.id]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setUnreadBelowCount(0);
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= 80;
    isAtBottomRef.current = nearBottom;
    setIsAtBottom(nearBottom);
    if (nearBottom) {
      setUnreadBelowCount(0);
    }
  };

  // Always jump to newest message on opening group or when sending/receiving
  useEffect(() => {
    if (!activeGroup) {
      prevGroupIdRef.current = null;
      prevMsgCountRef.current = 0;
      return;
    }

    const groupChanged = prevGroupIdRef.current !== activeGroup.id;
    const prevCount = prevMsgCountRef.current;
    const newCount = messages.length;

    if (groupChanged) {
      prevGroupIdRef.current = activeGroup.id;
      prevMsgCountRef.current = newCount;
      setUnreadBelowCount(0);
      requestAnimationFrame(() => scrollToBottom('auto'));
      return;
    }

    if (newCount > prevCount) {
      const lastMsg = messages[newCount - 1];
      const isFromMe = lastMsg?.senderId === currentUser.id;
      if (isFromMe || isAtBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      } else {
        setUnreadBelowCount((c) => c + (newCount - prevCount));
      }
    }

    prevMsgCountRef.current = newCount;
  }, [messages, activeGroup?.id, currentUser.id, attachedMedia]);

  const resetCreateWizard = () => {
    setWizardStep(1);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupCategory('Communauté Officielle');
    setNewGroupImage('');
    setNewGroupRules('');
    setNewGroupPrivate(false);
    setNewGroupClosedForMembers(false);
    setSelectedMemberIds([]);
    setSelectedInitialAdminIds([]);
    setCreateContactSearch('');
  };

  const handleSelectCategoryInWizard = (cat: string) => {
    setNewGroupCategory(cat);
    if (cat === 'Groupe Privé') {
      setNewGroupPrivate(true);
    }
  };

  const handleToggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(userId)) {
        // Also remove from initial admins if deselected
        setSelectedInitialAdminIds((admins) => admins.filter((id) => id !== userId));
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleToggleInitialAdmin = (userId: string) => {
    if (!selectedMemberIds.includes(userId)) {
      setSelectedMemberIds((prev) => [...prev, userId]);
    }
    setSelectedInitialAdminIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllContacts = () => {
    setSelectedMemberIds(userContacts.map((c) => c.id));
  };

  const handleDeselectAllContacts = () => {
    setSelectedMemberIds([]);
    setSelectedInitialAdminIds([]);
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsCreating(true);
    const groupId = `lisanga_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const allInitialMembers = Array.from(new Set([currentUser.id, ...selectedMemberIds]));
    const allInitialAdmins = Array.from(
      new Set([currentUser.id, ...selectedInitialAdminIds.filter((id) => allInitialMembers.includes(id))])
    );
    const isPrivateCategory = newGroupCategory === 'Groupe Privé';

    const newGroup: LisangaGroup = {
      id: groupId,
      name: newGroupName.trim(),
      description:
        newGroupDescription.trim() ||
        (isPrivateCategory
          ? 'Groupe privé réservé aux membres ajoutés par le propriétaire.'
          : 'Groupe Lisanga sur my Wahou'),
      imageUrl:
        newGroupImage ||
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
      category: newGroupCategory,
      isPrivate: isPrivateCategory ? true : newGroupPrivate,
      creatorId: currentUser.id,
      creatorName: currentUser.displayName,
      creatorTag: currentUser.profileTag,
      adminIds: allInitialAdmins,
      memberIds: allInitialMembers,
      membersCount: allInitialMembers.length,
      rules: newGroupRules.trim() || 'Respect mutuel et bienveillance au sein du groupe Lisanga.',
      isClosedForMembers: newGroupClosedForMembers,
      lastActivity: Date.now(),
      createdAt: Date.now(),
      isOfficial: isPrivateCategory ? false : currentUser.role === 'admin',
    };

    try {
      await createLisangaGroupInDb(newGroup);
      setIsCreating(false);
      setShowCreateModal(false);
      resetCreateWizard();
      // Make sure the newly created group is immediately visible in Lisanga menu & opened directly
      setSelectedCategory('all');
      setSearchQuery('');
      setActiveGroup(newGroup);
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  const handleLeaveGroup = async (group: LisangaGroup) => {
    if (group.creatorId === currentUser.id) {
      alert("Vous êtes le Propriétaire de ce groupe. Utilisez 'Infos' pour gérer les membres.");
      return;
    }
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
        text: `${contact.displayName} a été ajouté au groupe avec succès !`,
      });
    } catch (err) {
      console.error('Error adding contact to group:', err);
      setInviteFeedback({
        type: 'error',
        text: `Impossible d'ajouter ${contact.displayName}. Veuillez réessayer.`,
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
      mediaUrl: targetMsg.mediaUrl,
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
    if (!textInput.trim() && !attachedMedia) return;

    setIsSending(true);
    const contentToSend = textInput.trim();
    const mediaToSend = attachedMedia;
    const replyPayload = getReplyPayload(replyingToMessage);

    setTextInput('');
    setAttachedMedia(null);
    setReplyingToMessage(null);

    const msgId = `lisanga_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: LisangaMessage = {
      id: msgId,
      groupId: activeGroup.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      senderTag: currentUser.profileTag,
      type: mediaToSend ? mediaToSend.type : 'text',
      content: contentToSend,
      mediaUrl: mediaToSend?.url,
      mediaType: mediaToSend?.type,
      replyTo: replyPayload,
      timestamp: Date.now(),
    };

    try {
      playMessageSentSound();
      await sendLisangaMessageToDb(newMsg);
    } catch (err) {
      console.error('Error sending lisanga message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Stop & immediately send recorded audio note in Lisanga group
  const handleStopAndSendVoice = async () => {
    if (!activeGroup) return;
    try {
      const { blob, duration } = await stopRecording();
      if (!blob || blob.size === 0) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const replyPayload = getReplyPayload(replyingToMessage);
        const msgId = `lisanga_voice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newMsg: LisangaMessage = {
          id: msgId,
          groupId: activeGroup.id,
          senderId: currentUser.id,
          senderName: currentUser.displayName,
          senderAvatar: currentUser.avatarUrl,
          senderTag: currentUser.profileTag,
          type: 'voice',
          content: 'Note vocale',
          audioUrl: base64Audio,
          audioDuration: duration,
          replyTo: replyPayload,
          timestamp: Date.now(),
        };
        setReplyingToMessage(null);
        playMessageSentSound();
        await sendLisangaMessageToDb(newMsg);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error sending voice message in Lisanga:', err);
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
      (u) =>
        u.profileTag?.toLowerCase() === cleanQuery ||
        normalizeProfileTag(u.profileTag || '').toLowerCase() === normalizeProfileTag(cleanQuery).toLowerCase() ||
        u.email.toLowerCase() === cleanQuery ||
        u.displayName.toLowerCase() === cleanQuery
    );

    if (!targetUser) {
      setInviteFeedback({
        type: 'error',
        text: `Aucun utilisateur trouvé avec "${inviteTagInput}". Demandez-lui son tag #Tag@.`,
      });
      return;
    }

    if (activeGroup.memberIds.includes(targetUser.id)) {
      setInviteFeedback({
        type: 'error',
        text: `${targetUser.displayName} est déjà membre de ce groupe Lisanga.`,
      });
      return;
    }

    await joinLisangaGroupInDb(activeGroup.id, targetUser.id);
    setInviteFeedback({
      type: 'success',
      text: `${targetUser.displayName} a été ajouté au groupe avec succès !`,
    });
    setInviteTagInput('');
  };

  const isOwnerOfActive = activeGroup ? activeGroup.creatorId === currentUser.id : false;
  const isGroupAdmin = activeGroup
    ? Boolean(activeGroup.adminIds?.includes(currentUser.id) || isOwnerOfActive)
    : false;
  const canModerateActiveGroup = isGroupAdmin;

  // STRICT MEMBERSHIP RULE:
  // User ONLY sees groups they created OR where they were explicitly added in memberIds.
  // Never show groups they haven't been added to (including invite-link-only groups).
  const filteredGroups = groups.filter((g) => {
    if (!isUserMemberOfGroup(g)) return false;

    const matchCat = selectedCategory === 'all' || g.category === selectedCategory;
    const matchSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const isMemberOfActive = activeGroup ? isUserMemberOfGroup(activeGroup) : false;

  // Contacts filtering for group creation wizard
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
    <div className="flex-1 h-full bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row overflow-hidden select-none text-zinc-900 dark:text-zinc-100">
      {/* LEFT COLUMN: USER'S LISANGA GROUPS ONLY */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full shrink-0 ${
          activeGroup ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Lisanga Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Lisanga</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600/15 dark:bg-violet-600/30 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-bold">
                  Mes Groupes
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Vos groupes ajoutés & privés</p>
            </div>
          </div>

          <button
            onClick={() => {
              resetCreateWizard();
              setShowCreateModal(true);
            }}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Créer</span>
          </button>
        </div>

        {/* Search Groups */}
        <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans vos groupes..."
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
          </div>

          {/* Category Chips Carousel (including Groupe Privé) */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto custom-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-100 dark:divide-zinc-900 p-2 space-y-1">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-400">Aucun groupe dans votre espace</p>
              <p className="text-[10px] mt-1">
                Seuls les groupes où vous avez été ajouté ou que vous créez apparaissent ici.
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id;
              const isOwner = group.creatorId === currentUser.id;
              const isAdmin = group.adminIds?.includes(currentUser.id);
              const isPrivateGroup = group.category === 'Groupe Privé' || group.isPrivate;

              return (
                <div
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className={`p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group ${
                    isSelected
                      ? 'bg-violet-100 dark:bg-gradient-to-r dark:from-violet-950/70 dark:to-purple-950/50 border border-violet-500/40 text-zinc-900 dark:text-white shadow-lg'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="relative shrink-0">
                    <BrandBirdLogo
                      logoUrl={group.imageUrl}
                      alt={group.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800 group-hover:border-violet-500 transition bg-sky-50"
                    />
                    {group.isOfficial && !isPrivateGroup && (
                      <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-zinc-950 shadow">
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {isPrivateGroup && (
                      <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-violet-600 text-white shadow">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{group.name}</h4>
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
                        {group.memberIds?.length || group.membersCount || 1} m.
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate leading-relaxed">
                      {group.description}
                    </p>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {group.category}
                      </span>
                      {isOwner ? (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <Crown className="w-3 h-3" />
                          <span>Propriétaire</span>
                        </span>
                      ) : isAdmin ? (
                        <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-0.5">
                          <Shield className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          <span>Membre</span>
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
      <div
        className={`flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 ${
          !activeGroup ? 'hidden md:flex items-center justify-center' : 'flex'
        }`}
      >
        {!activeGroup ? (
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600/20 via-pink-600/20 to-amber-500/20 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 mx-auto mb-4 shadow-xl">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Bienvenue dans l'Espace Lisanga</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
              Vos groupes Lisanga et vos Groupes Privés apparaissent ici uniquement lorsque vous y êtes ajouté ou lorsque vous en créez un.
            </p>
            <button
              onClick={() => {
                resetCreateWizard();
                setShowCreateModal(true);
              }}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-violet-600/30 hover:scale-105 transition"
            >
              Créer un Nouveau Groupe Lisanga
            </button>
          </div>
        ) : (
          <>
            {/* Active Group Header */}
            <div className="px-4 py-3 bg-white/95 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveGroup(null)}
                  className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
                  title="Fermer la discussion du groupe"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => setShowGroupInfoModal(true)}
                  className="relative cursor-pointer hover:opacity-90 transition shrink-0"
                >
                  <BrandBirdLogo
                    logoUrl={activeGroup.imageUrl}
                    alt={activeGroup.name}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800 bg-sky-50"
                  />
                  {activeGroup.isOfficial && activeGroup.category !== 'Groupe Privé' && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-500 text-zinc-950 shadow">
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div onClick={() => setShowGroupInfoModal(true)} className="cursor-pointer min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                    <span>{activeGroup.name}</span>
                    {(activeGroup.isPrivate || activeGroup.category === 'Groupe Privé') && (
                      <Lock className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                    )}
                    {activeGroup.isClosedForMembers && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Fermée
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-2">
                    <span>{activeGroup.memberIds?.length || 1} membre(s)</span>
                    <span>•</span>
                    <span className="text-violet-600 dark:text-violet-400 font-semibold">{activeGroup.category}</span>
                  </p>
                </div>
              </div>

              {/* Group Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {canModerateActiveGroup && (
                  <button
                    type="button"
                    onClick={async () => {
                      const newStatus = !activeGroup.isClosedForMembers;
                      await toggleGroupDiscussionClosedForMembersInDb(activeGroup.id, newStatus);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border ${
                      activeGroup.isClosedForMembers
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                    }`}
                    title={
                      activeGroup.isClosedForMembers
                        ? 'Rouvrir la discussion aux membres'
                        : 'Fermer la discussion aux membres'
                    }
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {activeGroup.isClosedForMembers ? 'Rouvrir' : 'Fermer discussion'}
                    </span>
                  </button>
                )}

                {isMemberOfActive && (
                  <button
                    onClick={() => setShowGroupInfoModal(true)}
                    className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <UserPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="hidden sm:inline">Membres / Infos</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messages Flow with Auto-Scroll & Floating Down Arrow */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-zinc-100/70 dark:bg-zinc-950/70"
              >
                {/* Group Welcome Card */}
                <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 text-center max-w-xl mx-auto mb-4 shadow-sm">
                  <BrandBirdLogo
                    logoUrl={activeGroup.imageUrl}
                    alt={activeGroup.name}
                    className="w-16 h-16 rounded-3xl object-cover mx-auto mb-3 border-2 border-violet-500/50 shadow-lg bg-sky-50"
                  />
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h4 className="font-black text-base text-zinc-900 dark:text-white">{activeGroup.name}</h4>
                    {(activeGroup.category === 'Groupe Privé' || activeGroup.isPrivate) && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-600/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 text-[10px] font-bold">
                        Privé
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
                    {activeGroup.description}
                  </p>
                  <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                    📜 <strong>Règles du groupe :</strong>{' '}
                    {activeGroup.rules || 'Respect et bienveillance mutuelle.'}
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
                        <UserAvatar
                          name={msg.senderName}
                          avatarUrl={msg.senderAvatar}
                          size="sm"
                          className="shrink-0 mt-1"
                        />
                      )}

                      <div className={`max-w-[80%] sm:max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="font-bold text-violet-600 dark:text-violet-300">{msg.senderName}</span>
                            {msg.senderTag && (
                              <span className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400">
                                {msg.senderTag}
                              </span>
                            )}
                          </div>
                        )}

                        <div
                          className={`p-3.5 rounded-2xl text-sm leading-relaxed relative ${
                            isMe
                              ? 'bg-gradient-to-br from-violet-600 to-pink-600 text-white rounded-tr-none shadow-md shadow-violet-600/20'
                              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-tl-none shadow-sm'
                          }`}
                        >
                          {msg.replyTo && (
                            <div
                              onClick={() => scrollToMessage(msg.replyTo!.id)}
                              className={`mb-2 p-2 rounded-xl border-l-4 text-xs cursor-pointer select-none transition ${
                                isMe
                                  ? 'border-violet-200 bg-violet-950/60 hover:bg-violet-950 text-violet-100'
                                  : 'border-violet-500 bg-zinc-100 dark:bg-zinc-950/80 hover:bg-zinc-200 dark:hover:bg-zinc-950 text-zinc-700 dark:text-zinc-300'
                              }`}
                              title="Cliquer pour voir le message d'origine"
                            >
                              <div className="flex items-center gap-1 font-bold text-[11px] text-violet-600 dark:text-violet-300 mb-0.5">
                                <CornerDownRight className="w-3 h-3 shrink-0" />
                                <span className="truncate">{msg.replyTo.senderName}</span>
                              </div>
                              <p className="line-clamp-2 text-[11px] opacity-90 italic">{msg.replyTo.content}</p>
                            </div>
                          )}

                          {msg.type === 'voice' && msg.audioUrl && (
                            <div className="my-1">
                              <AudioPlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
                            </div>
                          )}

                          {msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden bg-black border border-white/10">
                              {msg.mediaType === 'video' ? (
                                <video src={msg.mediaUrl} controls className="max-h-60 w-full object-cover" />
                              ) : (
                                <img src={msg.mediaUrl} alt="Media" className="max-h-60 w-full object-cover" />
                              )}
                            </div>
                          )}

                          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                          <div
                            className={`text-[9px] mt-1 text-right ${
                              isMe ? 'text-violet-200' : 'text-zinc-500 dark:text-zinc-500'
                            }`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`opacity-0 group-hover:opacity-100 transition flex items-center gap-1 self-center ${
                          isMe ? 'mr-1' : 'ml-1'
                        }`}
                      >
                        <button
                          onClick={() => setReplyingToMessage(msg)}
                          className="p-1.5 rounded-full bg-white dark:bg-zinc-800/90 hover:bg-violet-600 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-white transition shadow-sm"
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

              {/* Floating Scroll-to-Bottom Arrow Button */}
              {!isAtBottom && (
                <button
                  id="lisanga-scroll-to-bottom-btn"
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-pink-600 text-white shadow-xl shadow-violet-600/40 border border-white/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                  title="Aller au dernier message"
                >
                  <ArrowDown className="w-5 h-5" />
                  {unreadBelowCount > 0 && (
                    <span className="absolute -top-2 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow ring-2 ring-white dark:ring-zinc-950">
                      {unreadBelowCount > 99 ? '99+' : unreadBelowCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Bottom Input Bar ONLY (No bottom menu bar visible inside discussion) */}
            {activeGroup.isClosedForMembers && !canModerateActiveGroup ? (
              <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-center flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>
                  Cette discussion est fermée par le propriétaire/administrateur. Seuls les administrateurs peuvent envoyer des messages.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                {replyingToMessage && (
                  <div className="mb-2 px-3 py-2 rounded-2xl bg-violet-50 dark:bg-gradient-to-r dark:from-violet-950/90 dark:to-zinc-900 border border-violet-300 dark:border-violet-500/40 flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-xl bg-violet-600/20 dark:bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                        <Reply className="w-3.5 h-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                          <span>
                            Réponse à{' '}
                            {replyingToMessage.senderId === currentUser.id
                              ? 'Vous-même'
                              : replyingToMessage.senderName}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate italic">
                          {replyingToMessage.type === 'voice' && '🎤 Note vocale'}
                          {replyingToMessage.type === 'image' && '🖼️ Photo'}
                          {replyingToMessage.type === 'video' && '🎬 Vidéo'}
                          {replyingToMessage.type === 'text' && replyingToMessage.content}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyingToMessage(null)}
                      className="p-1.5 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/60 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition shrink-0"
                      title="Annuler la réponse"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {attachedMedia && (
                  <div className="mb-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 max-w-xs">
                    <img src={attachedMedia.url} alt="Attach" className="w-12 h-12 rounded-lg object-cover" />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">Pièce jointe prête</span>
                    <button
                      onClick={() => setAttachedMedia(null)}
                      className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {recordingState.isRecording ? (
                  <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-500/40 rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold text-red-600 dark:text-red-300">
                        Enregistrement vocal... ({Math.round(recordingState.duration)}s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleStopAndSendVoice}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Square className="w-3 h-3" />
                        <span>Envoyer vocal</span>
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
                      className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 transition shrink-0"
                      title="Photo / Vidéo"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 transition shrink-0"
                      title="Enregistrer une note vocale"
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Message au groupe Lisanga..."
                      className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />

                    <button
                      type="submit"
                      disabled={isSending || (!textInput.trim() && !attachedMedia)}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold transition disabled:opacity-40 shrink-0 shadow-md shadow-violet-600/30"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: STEP-BY-STEP CREATE NEW LISANGA GROUP WIZARD (3 STEPS) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Wizard Header + Step Progress */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white">
                    Créer un Groupe Lisanga
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                    Étape {wizardStep} sur 3 •{' '}
                    {wizardStep === 1
                      ? 'Identité & Catégorie'
                      : wizardStep === 2
                      ? 'Règles & Contrôle'
                      : 'Membres & Administrateurs'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    wizardStep >= step
                      ? 'bg-gradient-to-r from-violet-600 to-pink-500'
                      : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              {/* STEP 1: IDENTITY & CATEGORY (INCLUDING GROUPE PRIVÉ) */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Catégorie du Groupe *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
                        const active = newGroupCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategoryInWizard(cat.id)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition ${
                              active
                                ? 'bg-violet-600 text-white border-violet-500 shadow-md'
                                : 'bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-violet-400'
                            }`}
                          >
                            {cat.icon}
                            <span className="truncate">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {newGroupCategory === 'Groupe Privé' && (
                      <p className="text-[11px] text-violet-600 dark:text-violet-300 mt-2 font-semibold bg-violet-500/10 border border-violet-500/20 rounded-xl p-2.5">
                        🔒 Groupe Privé : groupe non officiel visible uniquement par vous (Propriétaire) et les personnes que vous y ajoutez.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Nom du Groupe *
                    </label>
                    <input
                      type="text"
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder={
                        newGroupCategory === 'Groupe Privé'
                          ? 'Ex: Famille & Amis Proches'
                          : 'Ex: Lisanga Entrepreneurs RDC'
                      }
                      className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Description & Objectif
                    </label>
                    <textarea
                      rows={2}
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Décrivez en quelques mots l'objectif du groupe..."
                      className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Photo du Groupe
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
                        className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white font-bold text-xs flex items-center gap-2 shrink-0"
                      >
                        <ImageIcon className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                        <span>Choisir image</span>
                      </button>

                      <input
                        type="text"
                        value={newGroupImage}
                        onChange={(e) => setNewGroupImage(e.target.value)}
                        placeholder="Ou URL d'image..."
                        className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: RULES & MODERATION */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Règles & Charte du Groupe
                    </label>
                    <textarea
                      rows={3}
                      value={newGroupRules}
                      onChange={(e) => setNewGroupRules(e.target.value)}
                      placeholder="Ex: Respect mutuel, pas de spam ni liens externes sans autorisation..."
                      className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>

                  {newGroupCategory !== 'Groupe Privé' && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Confidentialité
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNewGroupPrivate(false)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                            !newGroupPrivate
                              ? 'bg-violet-600 text-white border-violet-500'
                              : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Standard (Membres ajoutés)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewGroupPrivate(true)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                            newGroupPrivate
                              ? 'bg-violet-600 text-white border-violet-500'
                              : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Strictement Privé</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setNewGroupClosedForMembers((v) => !v)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition text-left ${
                      newGroupClosedForMembers
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200'
                        : 'bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Mode Annonces (Admins uniquement)</p>
                      <p className="text-[11px] opacity-80">
                        Seuls le Propriétaire et les Administrateurs peuvent envoyer des messages.
                      </p>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full p-0.5 transition ${
                        newGroupClosedForMembers ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          newGroupClosedForMembers ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                </div>
              )}

              {/* STEP 3: ADD MEMBERS & APPOINT INITIAL ADMINS */}
              {wizardStep === 3 && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        Propriétaire du groupe : Vous ({currentUser.displayName})
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950">
                      Contrôle total
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          Ajouter des membres & nommer des admins
                        </span>
                      </div>
                      {selectedMemberIds.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-700 dark:text-violet-300 font-bold text-[10px]">
                          {selectedMemberIds.length} ajouté(s)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={createContactSearch}
                          onChange={(e) => setCreateContactSearch(e.target.value)}
                          placeholder="Filtrer vos contacts..."
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      {userContacts.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={handleSelectAllContacts}
                            className="px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold"
                          >
                            Tout
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAllContacts}
                            className="px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold"
                          >
                            Aucun
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {filteredCreateContacts.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-3">Aucun contact trouvé.</p>
                      ) : (
                        filteredCreateContacts.map((contact) => {
                          const isSelected = selectedMemberIds.includes(contact.id);
                          const isInitialAdmin = selectedInitialAdminIds.includes(contact.id);
                          return (
                            <div
                              key={contact.id}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                                isSelected
                                  ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-500/60 text-zinc-900 dark:text-white'
                                  : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              <div
                                onClick={() => handleToggleMemberSelection(contact.id)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                              >
                                <img
                                  src={
                                    contact.avatarUrl ||
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                                  }
                                  alt={contact.displayName}
                                  className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-xs truncate">{contact.displayName}</p>
                                  {contact.profileTag && (
                                    <p className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400 truncate">
                                      {contact.profileTag}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleInitialAdmin(contact.id)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                                      isInitialAdmin
                                        ? 'bg-purple-600 text-white border-purple-500 shadow'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                                    }`}
                                    title="Nommer administrateur du groupe"
                                  >
                                    <Shield className="w-3 h-3" />
                                    <span>{isInitialAdmin ? 'Admin ✓' : '+ Admin'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberSelection(contact.id)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                                    isSelected
                                      ? 'bg-violet-600 text-white shadow'
                                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                  }`}
                                >
                                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Footer Controls */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => (s === 3 ? 2 : 1))}
                    className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Précédent</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs"
                  >
                    Annuler
                  </button>
                )}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    disabled={wizardStep === 1 && !newGroupName.trim()}
                    onClick={() => setWizardStep((s) => (s === 1 ? 2 : 3))}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-40 text-white font-black text-xs shadow-lg shadow-violet-600/30 transition flex items-center gap-1.5"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isCreating || !newGroupName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-40 text-white font-black text-xs shadow-xl shadow-violet-600/30 transition flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isCreating
                        ? 'Ouverture du groupe...'
                        : `Créer & Ouvrir le groupe (${selectedMemberIds.length + 1})`}
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GROUP DETAILS, OWNER HIERARCHY & INVITE MEMBERS */}
      {showGroupInfoModal && activeGroup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">Détails du Groupe Lisanga</h3>
              <button
                onClick={() => setShowGroupInfoModal(false)}
                className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <BrandBirdLogo
                logoUrl={activeGroup.imageUrl}
                alt={activeGroup.name}
                className="w-20 h-20 rounded-3xl object-cover mx-auto mb-3 border-2 border-violet-500/50 shadow-xl bg-sky-50"
              />
              <h4 className="font-black text-lg text-zinc-900 dark:text-white mb-0.5">{activeGroup.name}</h4>
              <p className="text-xs text-violet-600 dark:text-violet-400 font-bold mb-2">{activeGroup.category}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-100 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-left">
                {activeGroup.description}
              </p>
            </div>

            {/* Instant Contact Addition (Admins & Propriétaire) */}
            {canModerateActiveGroup && (
              <>
                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold text-xs">
                      <UserPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span>Ajouter un utilisateur au groupe</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">1 clic</span>
                  </div>

                  {contactsNotInActiveGroup.length > 0 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={infoContactSearch}
                        onChange={(e) => setInfoContactSearch(e.target.value)}
                        placeholder="Chercher un contact à ajouter..."
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500"
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
                          className="p-2 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar
                              name={contact.displayName}
                              avatarUrl={contact.avatarUrl}
                              size="sm"
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                                {contact.displayName}
                              </p>
                              {contact.profileTag && (
                                <p className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {contact.profileTag}
                                </p>
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

                {/* Add member by unique tag */}
                <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-bold text-xs">
                    <UserCheck className="w-4 h-4" />
                    <span>Ou ajouter par identifiant unique (#Tag@)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteTagInput}
                      onChange={(e) => setInviteTagInput(e.target.value)}
                      placeholder="Ex: #Spart20@ ou email..."
                      className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 font-mono"
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
                    <p
                      className={`text-xs font-semibold ${
                        inviteFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {inviteFeedback.text}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Members List with Strict Propriétaire -> Administrateur -> Membre Hierarchy */}
            <div>
              <h5 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Membres & Rôles ({activeGroup.memberIds?.length || 1})
              </h5>

              <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                {activeGroup.memberIds?.map((memberId) => {
                  const member = allUsers.find(
                    (u) => u.id === memberId || u.email?.toLowerCase() === memberId.toLowerCase()
                  );
                  const isOwnerMember = memberId === activeGroup.creatorId;
                  const isMemberAdmin = !isOwnerMember && Boolean(activeGroup.adminIds?.includes(memberId));
                  const memberName = getContactDisplayName(member, null, memberId);

                  // Owner (Propriétaire) can promote/demote ANY non-owner and remove ANY non-owner (including appointed admins).
                  // Appointed Admin can remove regular non-admin members only (cannot remove Propriétaire or other Admins).
                  const canPromoteOrDemote = isOwnerOfActive && !isOwnerMember;
                  const canRemoveMember =
                    (isOwnerOfActive && !isOwnerMember) ||
                    (isGroupAdmin && !isOwnerMember && !isMemberAdmin);

                  return (
                    <div
                      key={memberId}
                      className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={memberName}
                          avatarUrl={member?.avatarUrl}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-zinc-900 dark:text-white truncate">{memberName}</p>
                          {member?.profileTag && (
                            <p className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400 truncate">
                              {member.profileTag}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwnerMember ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5" /> Propriétaire
                          </span>
                        ) : isMemberAdmin ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> Admin
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-medium">Membre</span>
                        )}

                        {canPromoteOrDemote && (
                          <button
                            type="button"
                            onClick={async () => {
                              await toggleGroupAdminInDb(activeGroup.id, memberId, !isMemberAdmin);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition border ${
                              isMemberAdmin
                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                                : 'bg-purple-600/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-600/25'
                            }`}
                            title={
                              isMemberAdmin
                                ? "Supprimer cet administrateur nommé"
                                : "Nommer cette personne administrateur"
                            }
                          >
                            {isMemberAdmin ? '- Admin' : '+ Admin'}
                          </button>
                        )}

                        {canRemoveMember && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                confirm(
                                  `Supprimer ${memberName} ${
                                    isMemberAdmin ? '(Administrateur)' : ''
                                  } du groupe ?`
                                )
                              ) {
                                await removeMemberFromLisangaGroupInDb(activeGroup.id, memberId);
                              }
                            }}
                            className="p-1 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border border-red-500/30 transition"
                            title={
                              isMemberAdmin
                                ? "Supprimer l'administrateur du groupe"
                                : "Supprimer l'utilisateur du groupe"
                            }
                          >
                            {isMemberAdmin ? <Trash2 className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Group Action (Non-owners) */}
            {isMemberOfActive && !isOwnerOfActive && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleLeaveGroup(activeGroup)}
                  className="w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-300 border border-red-500/30 font-bold text-xs transition flex items-center justify-center gap-2"
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
