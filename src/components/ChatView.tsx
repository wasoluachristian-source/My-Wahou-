import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import {
  Send,
  Mic,
  Trash2,
  Image as ImageIcon,
  Phone,
  Video,
  MessageSquare,
  Smile,
  Check,
  CheckCheck,
  Crown,
  Maximize2,
  X,
  Reply,
  CornerDownRight,
  MoreHorizontal,
  Heart,
  Download,
  Play,
  Palette,
  Sparkles,
  ArrowLeft,
  ArrowDown,
  MoreVertical,
  Pencil,
  Info,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, ChatMessage, AppSettings, ChatMessageReply } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { UserAvatar } from './UserAvatar';
import { MediaViewer } from './MediaViewer';
import { ChatWallpaperModal } from './ChatWallpaperModal';
import { getStoredChatWallpaper } from '../utils/themeUtils';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  sendMessageToDb,
  reactToMessageInDb,
  deleteMessageFromDb,
  markMessagesAsReadInDb,
  setTypingStatusInDb,
  updateUserInDb,
  getContactDisplayName,
  getUserContactNickname,
  setUserContactNickname
} from '../services/dbService';
import { compressImageFile, downloadMediaFile } from '../utils/mediaUtils';
import { playMessageSentSound, playMessageClickSound, playKeyTypeSound, playUiTapSound, playHapticClickSound } from '../utils/soundUtils';

interface ChatViewProps {
  conversationId: string;
  currentUser: UserProfile;
  targetUser?: UserProfile;
  messages: ChatMessage[];
  appSettings: AppSettings;
  onStartCall: (isVideo: boolean) => void;
  onOpenForfaitModal: () => void;
  onBack?: () => void;
}

export function ChatView({
  conversationId,
  currentUser,
  targetUser,
  messages,
  appSettings,
  onStartCall,
  onOpenForfaitModal,
  onBack,
}: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [selectedMessageAction, setSelectedMessageAction] = useState<ChatMessage | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [contactNickname, setContactNickname] = useState<string>(() =>
    getUserContactNickname(currentUser?.id, targetUser?.id)
  );

  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync nickname when target user changes
  useEffect(() => {
    setContactNickname(getUserContactNickname(currentUser?.id, targetUser?.id));
  }, [currentUser?.id, targetUser?.id]);

  // Close moreMenu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    senderName?: string;
    timestamp?: number;
  } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [isTargetTyping, setIsTargetTyping] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState<string | null>(() =>
    getStoredChatWallpaper(conversationId)
  );

  // Sync wallpaper when conversation changes or event fires
  useEffect(() => {
    setChatWallpaper(getStoredChatWallpaper(conversationId));

    const handleWallpaperUpdate = (e: CustomEvent<string | null>) => {
      setChatWallpaper(e.detail);
    };

    window.addEventListener(
      `mywahou_chat_wallpaper_updated_${conversationId}`,
      handleWallpaperUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        `mywahou_chat_wallpaper_updated_${conversationId}`,
        handleWallpaperUpdate as EventListener
      );
    };
  }, [conversationId]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const prevMsgCountRef = useRef<number>(0);
  const prevConvoIdRef = useRef<string>(conversationId);
  const isAtBottomRef = useRef<boolean>(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);

  const {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

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
    const atBottom = distanceFromBottom <= 85;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadBelowCount(0);
    }
  };

  // Mark incoming messages as read when viewing conversation
  useEffect(() => {
    if (conversationId && currentUser?.id) {
      markMessagesAsReadInDb(conversationId, currentUser.id);
    }
  }, [conversationId, currentUser?.id, messages.length]);

  // Always jump straight to the newest message on conversation open, and track new messages
  useEffect(() => {
    if (prevConvoIdRef.current !== conversationId) {
      prevConvoIdRef.current = conversationId;
      prevMsgCountRef.current = messages.length;
      setUnreadBelowCount(0);
      isAtBottomRef.current = true;
      setIsAtBottom(true);
      requestAnimationFrame(() => scrollToBottom('auto'));
      return;
    }

    const prevCount = prevMsgCountRef.current;
    const currCount = messages.length;
    prevMsgCountRef.current = currCount;

    if (currCount > prevCount) {
      const lastMsg = messages[currCount - 1];
      const sentByMe = lastMsg?.senderId === currentUser.id;
      // Always scroll directly to newly sent/received message when at bottom, initial load, or sent by self
      if (prevCount === 0 || isAtBottomRef.current || sentByMe) {
        requestAnimationFrame(() => scrollToBottom(prevCount === 0 ? 'auto' : 'smooth'));
      } else {
        setUnreadBelowCount((c) => c + (currCount - prevCount));
      }
    }
  }, [conversationId, messages, currentUser.id]);

  useEffect(() => {
    if (recordingState.isRecording || isTargetTyping) {
      if (isAtBottomRef.current) {
        scrollToBottom('smooth');
      }
    }
  }, [recordingState.isRecording, isTargetTyping]);

  const getReplyPayload = (targetMsg: ChatMessage | null): ChatMessageReply | undefined => {
    if (!targetMsg) return undefined;
    let contentPreview = targetMsg.content;
    if (targetMsg.type === 'voice') contentPreview = '🎤 Note vocale';
    if (targetMsg.type === 'image') contentPreview = '🖼️ Photo';
    if (targetMsg.type === 'video') contentPreview = '🎬 Vidéo';

    return {
      id: targetMsg.id,
      senderName: targetMsg.senderId === currentUser.id ? 'Vous' : targetMsg.senderName,
      senderTag: targetMsg.senderId === currentUser.id ? currentUser.profileTag : undefined,
      content: contentPreview || 'Message',
      type: targetMsg.type,
      mediaUrl: targetMsg.mediaUrl,
    };
  };

  // Handle typing status notification
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Son de frappe au clavier réaliste
    playKeyTypeSound();

    if (conversationId && currentUser?.id) {
      setTypingStatusInDb(conversationId, currentUser.id, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatusInDb(conversationId, currentUser.id, false);
      }, 2500);
    }
  };

  // Send standard free text message
  const handleSendText = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTypingStatusInDb(conversationId, currentUser.id, false);

    const replyPayload = getReplyPayload(replyingToMessage);

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      senderTag: currentUser.profileTag,
      type: 'text',
      content: inputText.trim(),
      replyTo: replyPayload,
      timestamp: Date.now(),
      isDelivered: true,
      isRead: false,
    };

    setInputText('');
    setReplyingToMessage(null);
    playMessageSentSound();
    await sendMessageToDb(newMsg, targetUser?.id);
  };

  // Send free voice memo
  const handleSendVoice = async () => {
    try {
      const replyPayload = getReplyPayload(replyingToMessage);
      const { blob, duration } = await stopRecording();

      // Convert blob to base64 for Firestore persistence
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const newMsg: ChatMessage = {
          id: `voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          conversationId,
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
          isDelivered: true,
          isRead: false,
        };

        setReplyingToMessage(null);
        playMessageSentSound();
        await sendMessageToDb(newMsg, targetUser?.id);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error sending voice message:', err);
    }
  };

  // Trigger file selection with Forfait Quota verification
  const handleTriggerMediaUpload = () => {
    const hasQuota = currentUser.isVIP || (currentUser.mediaQuota || 0) > 0;

    if (!hasQuota) {
      onOpenForfaitModal();
      return;
    }

    fileInputRef.current?.click();
  };

  // Handle file chosen (Image / Video)
  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const isVideo = file.type.startsWith('video');
      const isImage = file.type.startsWith('image');

      if (!isVideo && !isImage) {
        alert('Veuillez sélectionner un fichier image ou vidéo valide.');
        setIsUploadingMedia(false);
        return;
      }

      let base64Data: string;
      if (isImage) {
        base64Data = await compressImageFile(file, 1000, 1000, 0.85);
      } else {
        const reader = new FileReader();
        base64Data = await new Promise((res, rej) => {
          reader.onloadend = () => res(reader.result as string);
          reader.onerror = (err) => rej(err);
          reader.readAsDataURL(file);
        });
      }

      const replyPayload = getReplyPayload(replyingToMessage);

      const newMsg: ChatMessage = {
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderAvatar: currentUser.avatarUrl,
        senderTag: currentUser.profileTag,
        type: isVideo ? 'video' : 'image',
        content: isVideo ? '🎬 Vidéo envoyée' : '🖼️ Photo envoyée',
        mediaUrl: base64Data,
        mediaType: isVideo ? 'video' : 'image',
        replyTo: replyPayload,
        timestamp: Date.now(),
        isDelivered: true,
        isRead: false,
      };

      setReplyingToMessage(null);
      await sendMessageToDb(newMsg, targetUser?.id);

      // Deduct 1 media token if not VIP
      if (!currentUser.isVIP) {
        const remaining = Math.max(0, (currentUser.mediaQuota || 0) - 1);
        await updateUserInDb(currentUser.id, { mediaQuota: remaining });
      }
    } catch (err) {
      console.error('Media upload error:', err);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Double-Click / Double-Tap on a message
  const handleMessageTouchOrClick = (msg: ChatMessage) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.id === msg.id && now - last.time < 350) {
      // Double tap detected!
      setSelectedMessageAction(msg);
      lastTapRef.current = { id: '', time: 0 };
    } else {
      lastTapRef.current = { id: msg.id, time: now };
    }
  };

  // Handle Reactions
  const handleReact = async (messageId: string, emoji: string) => {
    await reactToMessageInDb(messageId, { userId: currentUser.id, emoji });
    setShowEmojiPicker(null);
    setSelectedMessageAction(null);
  };

  // Handle Message Deletion
  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (confirm('Voulez-vous supprimer ce message ?')) {
      await deleteMessageFromDb(msg.id);
      setSelectedMessageAction(null);
    }
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-violet-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-violet-400');
      }, 1500);
    }
  };

  const reactionEmojis = ['❤️', '🔥', '👍', '😂', '😮', '😢', '🙏'];

  return (
    <div
      id="chat-view-container"
      className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden"
    >
      {/* Ambient background glow & liquid titanium aura */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Chat Top Header - iOS 18 Frosted Titanium */}
      <header
        id="chat-header"
        className="p-3 sm:p-3.5 border-b border-zinc-200/80 dark:border-white/10 glass-titanium flex items-center justify-between z-20 shrink-0 shadow-lg"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              id="chat-back-to-list-btn"
              onClick={() => {
                playUiTapSound();
                onBack();
              }}
              className="p-1.5 -ml-1 rounded-xl bg-zinc-900/5 dark:bg-white/5 hover:bg-zinc-900/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition active:scale-95 shrink-0"
              title="Retour aux discussions"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <UserAvatar
            name={contactNickname || getContactDisplayName(targetUser, null, undefined, currentUser.id)}
            avatarUrl={targetUser?.avatarUrl}
            size="md"
            isOnline={targetUser?.isOnline}
            showOnlineStatus={true}
            isVIP={false}
            className="border-2 border-zinc-300 dark:border-white/20 shadow-md shrink-0"
          />

          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white drop-shadow-sm truncate">
              {contactNickname || getContactDisplayName(targetUser, null, undefined, currentUser.id)}
            </h3>
            <p className="text-[11px] flex items-center gap-1.5 mt-0.5">
              {targetUser?.isOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  En ligne
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-400 truncate">
                  {targetUser?.statusText || 'Messagerie instantanée & gratuite'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Header Actions: ONLY Audio Call & 3 Dots Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Audio Call - Normal */}
          <button
            id="start-audio-call-btn"
            onClick={() => {
              playUiTapSound();
              onStartCall(false);
            }}
            className="p-2 sm:px-3 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-white border border-cyan-500/30 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold shadow-sm"
            title="Appel normal"
          >
            <Phone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Appel</span>
          </button>

          {/* 3-dots Menu Button */}
          <div className="relative" ref={moreMenuRef}>
            <button
              id="chat-more-options-btn"
              onClick={() => {
                playUiTapSound();
                setShowMoreMenu(!showMoreMenu);
              }}
              className="p-2 sm:p-2.5 rounded-2xl bg-zinc-900/5 dark:bg-white/5 hover:bg-zinc-900/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10 transition active:scale-95"
              title="Options & personnalisation"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMoreMenu && (
              <div className="absolute right-0 top-12 w-64 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200 dark:border-white/15 rounded-3xl p-2 shadow-2xl z-50 animate-fade-in space-y-1">
                {/* Option: Appel vidéo */}
                <button
                  id="chat-menu-video-call"
                  onClick={() => {
                    playUiTapSound();
                    setShowMoreMenu(false);
                    onStartCall(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-xs font-semibold text-pink-600 dark:text-pink-300 hover:text-pink-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition text-left"
                >
                  <Video className="w-4 h-4 text-pink-500 dark:text-pink-400 shrink-0" />
                  <span>Appel vidéo HD</span>
                </button>

                {/* Option: Modification de couleur et photos de personnalisation */}
                <button
                  id="chat-menu-custom-colors"
                  onClick={() => {
                    playUiTapSound();
                    setShowMoreMenu(false);
                    setIsWallpaperModalOpen(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-xs font-semibold text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition text-left"
                >
                  <Palette className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
                  <span>Couleur & photos fond d'écran</span>
                </button>

                {/* Option: Surnom */}
                <button
                  id="chat-menu-nickname"
                  onClick={() => {
                    playUiTapSound();
                    setShowMoreMenu(false);
                    setNicknameInput(contactNickname || '');
                    setShowNicknameModal(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-xs font-semibold text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition text-left"
                >
                  <Pencil className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>Attribuer un surnom</span>
                </button>

                {/* Option: Infos de l'utilisateur & VIP */}
                <button
                  id="chat-menu-user-info"
                  onClick={() => {
                    playUiTapSound();
                    setShowMoreMenu(false);
                    setShowUserInfoModal(true);
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl flex items-center gap-3 text-xs font-semibold text-cyan-600 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition text-left border-t border-zinc-200 dark:border-white/5 pt-2"
                >
                  <Info className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                  <span>Infos & Statut VIP</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Announcement Sub-banner if active */}
      {appSettings.showAnnouncement && appSettings.announcement && (
        <div className="px-4 py-2 bg-gradient-to-r from-violet-100 via-white to-pink-100 dark:from-violet-950/70 dark:via-zinc-900 dark:to-pink-950/70 border-b border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-amber-500 dark:text-amber-400">📢</span>
            <span className="truncate">{appSettings.announcement}</span>
          </div>
        </div>
      )}

      {/* Messages Stream Wrapper with Dynamic Per-Chat Wallpaper */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Discussion Custom Background Wallpaper (Photo 1 Style - Supports Photo & Colors) */}
        {chatWallpaper && (
          <div
            className="absolute inset-0 pointer-events-none -z-0 transition-all duration-500"
            style={
              chatWallpaper.startsWith('data:image') ||
              chatWallpaper.startsWith('http') ||
              chatWallpaper.startsWith('blob:')
                ? {
                    backgroundImage: `url(${chatWallpaper})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {
                    background: chatWallpaper,
                  }
            }
          >
            {/* Soft dark vignette overlay so text bubbles remain crisp and high-contrast */}
            <div className="absolute inset-0 bg-black/25 dark:bg-black/40 backdrop-blur-[0.5px]" />
          </div>
        )}

        <div
          id="messages-stream"
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 z-10"
        >
        {/* Welcome card for new thread */}
        {messages.length === 0 && (
          <div className="text-center my-12 max-w-sm mx-auto p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 backdrop-blur-md shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-violet-600/30">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-zinc-900 dark:text-white text-base mb-1">
              Discussion instantanée my Wahou
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
              Envoyez des messages écrits et enregistrez des notes vocales <strong>100% gratuitement</strong> sans aucun forfait.
            </p>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              💡 <em>Astuce :</em> Double-cliquez sur un message pour <strong>Répondre</strong>, <strong>Supprimer</strong> ou ajouter des <strong>Emojis</strong>.
            </div>
          </div>
        )}

        {/* Message Items */}
        {messages.map((msg) => {
          const isSelf = msg.senderId === currentUser.id;

          // Call log special bubble
          if (msg.type === 'call_log') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="px-4 py-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2 shadow-sm">
                  <Phone className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>{msg.content}</span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              onDoubleClick={() => setSelectedMessageAction(msg)}
              onClick={() => handleMessageTouchOrClick(msg)}
              className={`flex items-end gap-2.5 group transition-all duration-300 rounded-2xl p-1 relative cursor-pointer ${
                isSelf ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar for other user */}
              {!isSelf && (
                <UserAvatar
                  name={msg.senderName}
                  avatarUrl={msg.senderAvatar}
                  size="sm"
                  className="mb-1"
                />
              )}

              {/* Message Bubble Container */}
              <div className={`relative max-w-[85%] sm:max-w-md ${isSelf ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-3xl p-3.5 shadow-lg relative transition-all duration-200 ${
                    isSelf
                      ? 'glass-bubble-sent text-white rounded-br-sm'
                      : 'glass-bubble-received text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                  }`}
                >
                  {/* Sender Name if in group/lisanga or not self */}
                  {!isSelf && (
                    <div className="text-[11px] font-bold text-cyan-400 mb-1 flex items-center justify-between gap-2">
                      <span>{msg.senderName}</span>
                      {msg.senderTag && (
                        <span className="text-[9px] font-mono text-zinc-400">{msg.senderTag}</span>
                      )}
                    </div>
                  )}

                  {/* Quoted Reply if message was a reply */}
                  {msg.replyTo && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToMessage(msg.replyTo!.id);
                      }}
                      className={`mb-2 p-2 px-3 rounded-2xl border-l-4 text-xs cursor-pointer select-none transition ${
                        isSelf
                          ? 'border-cyan-300 bg-white/10 hover:bg-white/15 text-white'
                          : 'border-violet-400 bg-white/5 hover:bg-white/10 text-zinc-200'
                      }`}
                      title="Cliquer pour voir le message d'origine"
                    >
                      <div className="flex items-center gap-1 font-bold text-[11px] text-cyan-300 mb-0.5">
                        <CornerDownRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">{msg.replyTo.senderName}</span>
                      </div>
                      <p className="line-clamp-2 text-[11px] opacity-90 italic">
                        {msg.replyTo.content}
                      </p>
                    </div>
                  )}

                  {/* 1. Voice Note Message */}
                  {msg.type === 'voice' && msg.audioUrl && (
                    <div className="my-1">
                      <AudioPlayer
                        audioUrl={msg.audioUrl}
                        duration={msg.audioDuration}
                        isSelf={isSelf}
                      />
                    </div>
                  )}

                  {/* 2. Image Media Message */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div className="my-1 rounded-2xl overflow-hidden cursor-pointer relative group/img max-h-72 border border-white/10">
                      <img
                        src={msg.mediaUrl}
                        alt="Photo envoyée"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxMedia({
                            url: msg.mediaUrl!,
                            type: 'image',
                            senderName: msg.senderName,
                            timestamp: msg.timestamp,
                          });
                        }}
                        className="w-full object-cover rounded-2xl hover:scale-102 transition duration-200"
                      />
                      {/* Hover action overlay with View and Quick Download buttons */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxMedia({
                            url: msg.mediaUrl!,
                            type: 'image',
                            senderName: msg.senderName,
                            timestamp: msg.timestamp,
                          });
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-3 text-white"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxMedia({
                              url: msg.mediaUrl!,
                              type: 'image',
                              senderName: msg.senderName,
                              timestamp: msg.timestamp,
                            });
                          }}
                          className="p-2.5 rounded-full bg-zinc-950/80 hover:bg-violet-600 border border-white/20 transition shadow-lg"
                          title="Agrandir et regarder la photo"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMediaFile(
                              msg.mediaUrl!,
                              `myWahou_photo_${new Date(msg.timestamp).toISOString().slice(0, 10)}.jpg`
                            );
                          }}
                          className="p-2.5 rounded-full bg-zinc-950/80 hover:bg-pink-600 border border-white/20 transition shadow-lg text-pink-200"
                          title="Enregistrer / Télécharger la photo"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Video Media Message */}
                  {msg.type === 'video' && msg.mediaUrl && (
                    <div className="my-1 rounded-2xl overflow-hidden max-h-72 relative group/vid border border-white/10 bg-black">
                      <video
                        src={msg.mediaUrl}
                        controls
                        playsInline
                        className="w-full rounded-2xl bg-black"
                      />
                      {/* Quick action bar below video */}
                      <div className="flex items-center justify-between px-2 py-1 bg-zinc-950/90 text-xs text-zinc-300 rounded-b-xl border-t border-zinc-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxMedia({
                              url: msg.mediaUrl!,
                              type: 'video',
                              senderName: msg.senderName,
                              timestamp: msg.timestamp,
                            });
                          }}
                          className="text-[11px] font-semibold text-violet-300 hover:text-white flex items-center gap-1 py-1"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Plein écran</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadMediaFile(
                              msg.mediaUrl!,
                              `myWahou_video_${new Date(msg.timestamp).toISOString().slice(0, 10)}.mp4`
                            );
                          }}
                          className="text-[11px] font-bold text-pink-300 hover:text-pink-200 flex items-center gap-1 py-1 px-2 rounded-lg bg-pink-950/60 hover:bg-pink-900/80 border border-pink-500/30"
                          title="Enregistrer la vidéo sur votre appareil"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Enregistrer vidéo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. Text Message */}
                  {msg.type === 'text' && (
                    <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}

                  {/* Footer (Timestamp + Status "Vu" / Checkmarks + Mini Avatar Bubble) */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 pt-0.5 text-[10px] select-none">
                    <span className="opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Read Status for sender messages */}
                    {isSelf && (
                      <div className="flex items-center gap-1">
                        {msg.isRead ? (
                          <span className="flex items-center gap-1 text-cyan-300 font-bold bg-cyan-950/50 px-1.5 py-0.5 rounded-full border border-cyan-500/30 text-[9px]">
                            <span>Vu</span>
                            <CheckCheck className="w-3 h-3 text-cyan-300" />
                            {/* Petite photo / boule miniature de l'utilisateur qui a vu */}
                            <UserAvatar
                              name={getContactDisplayName(targetUser)}
                              avatarUrl={targetUser?.avatarUrl}
                              size="xs"
                              className="w-3.5 h-3.5 ring-1 ring-cyan-400/60 ml-0.5"
                            />
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 opacity-60 text-zinc-300">
                            {msg.isDelivered ? (
                              <span title="Distribué (Non lu)"><CheckCheck className="w-3.5 h-3.5 text-zinc-300" /></span>
                            ) : (
                              <span title="Envoyé"><Check className="w-3.5 h-3.5 text-zinc-400" /></span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reactions list */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex items-center gap-1 mt-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions.map((r, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs shadow-sm"
                      >
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Action Button on Hover */}
                <div
                  className={`absolute top-0 ${
                    isSelf ? '-left-12' : '-right-12'
                  } opacity-0 group-hover:opacity-100 transition flex items-center gap-1 z-10`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMessageAction(msg);
                    }}
                    className="p-1.5 rounded-full bg-zinc-900/90 hover:bg-violet-900 border border-zinc-800 text-zinc-400 hover:text-white transition shadow-sm"
                    title="Options (Répondre, Supprimer, Emojis)"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
        </div>

        {/* Floating Down-Arrow Button to Jump Directly to Latest Message */}
        {(!isAtBottom || unreadBelowCount > 0) && (
          <button
            id="chat-scroll-to-bottom-btn"
            type="button"
            onClick={() => {
              playUiTapSound();
              scrollToBottom('smooth');
            }}
            className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-xl shadow-violet-600/40 border border-white/25 flex items-center justify-center transition transform hover:scale-105 active:scale-95"
            title="Descendre au dernier message"
          >
            <ArrowDown className="w-5 h-5" />
            {unreadBelowCount > 0 && (
              <span className="absolute -top-2 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-950 animate-bounce">
                {unreadBelowCount > 99 ? '99+' : unreadBelowCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Hidden File Input for Image/Video */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Chat Bottom Input Bar - iOS 18 Frosted Titanium Dock (Pure Text / Voice / Send Controls) */}
      <footer
        id="chat-input-bar"
        className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-white/10 glass-titanium z-20 shrink-0 shadow-2xl"
      >
        {/* Replying Banner */}
        {replyingToMessage && (
          <div className="mb-2 p-2 px-3 rounded-2xl bg-zinc-900/5 dark:bg-white/10 border border-zinc-200 dark:border-white/15 backdrop-blur-xl flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1 rounded-xl bg-violet-600/20 dark:bg-violet-600/30 text-violet-600 dark:text-cyan-300 shrink-0">
                <Reply className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs overflow-hidden">
                <div className="font-bold text-zinc-900 dark:text-white text-[11px] truncate">
                  Réponse à {replyingToMessage.senderId === currentUser.id ? 'Vous' : replyingToMessage.senderName}
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                  {replyingToMessage.type === 'voice'
                    ? '🎤 Note vocale'
                    : replyingToMessage.type === 'image'
                    ? '🖼️ Photo'
                    : replyingToMessage.type === 'video'
                    ? '🎬 Vidéo'
                    : replyingToMessage.content}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                playUiTapSound();
                setReplyingToMessage(null);
              }}
              className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition shrink-0"
              title="Annuler la réponse"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* If audio is currently recording */}
        {recordingState.isRecording ? (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-zinc-900/5 dark:bg-white/10 border border-zinc-300 dark:border-white/20 animate-pulse backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/50 animate-ping">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>Enregistrement vocal gratuit...</span>
                  <span className="font-mono text-pink-500 dark:text-pink-400">
                    {Math.floor(recordingState.duration / 60)}:
                    {(recordingState.duration % 60).toFixed(0).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ 100% Gratuit sans forfait
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="cancel-voice-btn"
                onClick={cancelRecording}
                className="p-2.5 rounded-xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition active:scale-95 border border-zinc-300 dark:border-white/10"
                title="Annuler l'enregistrement"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                id="send-voice-btn"
                onClick={handleSendVoice}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/30 active:scale-95 border border-white/20"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Text / Media / Mic Input Bar */
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Media Upload Button */}
            <button
              type="button"
              id="upload-media-btn"
              onClick={() => {
                playUiTapSound();
                handleTriggerMediaUpload();
              }}
              disabled={isUploadingMedia}
              className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900/5 dark:bg-white/5 hover:bg-zinc-900/10 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition shrink-0 relative group active:scale-95 shadow-sm"
              title="Envoyer Photo / Vidéo (Forfait Médias)"
            >
              <ImageIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              {!currentUser.isVIP && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-pink-600 text-white shadow-sm border border-white/20">
                  {currentUser.mediaQuota || 0}
                </span>
              )}
            </button>

            {/* Text Input Field */}
            <div className="flex-1 relative">
              <input
                id="message-text-input"
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Écrivez un message gratuit..."
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400/80 focus:bg-white dark:focus:bg-white/10 transition shadow-inner"
              />
            </div>

            {/* If text is typed, show Send button; otherwise show Mic button */}
            {inputText.trim() ? (
              <button
                id="send-text-message-btn"
                type="submit"
                className="p-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-600 text-white shadow-lg shadow-violet-600/30 hover:opacity-90 transition active:scale-95 shrink-0 border border-white/20"
                title="Envoyer le message (Gratuit)"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                id="start-voice-recording-btn"
                type="button"
                onClick={startRecording}
                className="p-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 hover:scale-105 transition active:scale-95 shrink-0 border border-white/20"
                title="Enregistrer un message vocal (iPhone / Android / Web)"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </footer>

      {/* DOUBLE CLICK / TAP MESSAGE ACTION MODAL */}
      {selectedMessageAction && (
        <div
          id="message-action-dialog"
          onClick={() => setSelectedMessageAction(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                Options du message ({selectedMessageAction.senderId === currentUser.id ? 'Vous' : selectedMessageAction.senderName})
              </div>
              <button
                onClick={() => setSelectedMessageAction(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emojis row */}
            <div>
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                Ajouter une réaction
              </label>
              <div className="flex items-center justify-between gap-1 p-2 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(selectedMessageAction.id, emoji)}
                    className="w-9 h-9 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xl transition flex items-center justify-center active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setReplyingToMessage(selectedMessageAction);
                  setSelectedMessageAction(null);
                  document.getElementById('message-text-input')?.focus();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition"
              >
                <Reply className="w-4 h-4" />
                <span>Répondre à ce message</span>
              </button>

              {(selectedMessageAction.senderId === currentUser.id || currentUser.role === 'admin') && (
                <button
                  onClick={() => handleDeleteMessage(selectedMessageAction)}
                  className="w-full py-3 px-4 rounded-2xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer ce message</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rich Interactive Media Viewer & Downloader Modal */}
      {lightboxMedia && (
        <MediaViewer
          isOpen={Boolean(lightboxMedia)}
          onClose={() => setLightboxMedia(null)}
          mediaUrl={lightboxMedia.url}
          mediaType={lightboxMedia.type}
          senderName={lightboxMedia.senderName || getContactDisplayName(targetUser)}
          timestamp={lightboxMedia.timestamp || Date.now()}
        />
      )}

      {/* Discussion Background Wallpaper Customizer Modal (Photo 1) */}
      <ChatWallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        conversationId={conversationId}
        contactName={getContactDisplayName(targetUser)}
      />

      {/* Modal: Définir un surnom personnalisé pour ce contact */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
                  <Pencil className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">Surnom du contact</h3>
              </div>
              <button
                onClick={() => setShowNicknameModal(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Personnalisez le nom affiché pour cet utilisateur. Ce surnom n'est visible que par vous.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Nom d'origine
              </label>
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                {targetUser?.displayName || 'Utilisateur'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Surnom personnalisé
              </label>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="Ex: Mon Ami, Boss, Maman..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 transition placeholder:text-zinc-500 dark:placeholder:text-zinc-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              {contactNickname && (
                <button
                  type="button"
                  onClick={() => {
                    playUiTapSound();
                    if (targetUser?.id) {
                      setUserContactNickname(currentUser.id, targetUser.id, '');
                      setContactNickname('');
                    }
                    setShowNicknameModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition"
                >
                  Effacer
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playUiTapSound();
                  if (targetUser?.id) {
                    setUserContactNickname(currentUser.id, targetUser.id, nicknameInput.trim());
                    setContactNickname(nicknameInput.trim());
                  }
                  setShowNicknameModal(false);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Infos du contact & Statut VIP */}
      {showUserInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Profil du contact</h3>
              <button
                onClick={() => setShowUserInfoModal(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar & Identité */}
            <div className="flex flex-col items-center text-center space-y-2 py-2">
              <UserAvatar
                name={contactNickname || getContactDisplayName(targetUser)}
                avatarUrl={targetUser?.avatarUrl}
                size="lg"
                isOnline={targetUser?.isOnline}
                showOnlineStatus={true}
                isVIP={targetUser?.isVIP}
                className="w-20 h-20 border-4 border-zinc-200 dark:border-white/15 shadow-xl"
              />
              <div>
                <h4 className="font-black text-lg text-zinc-900 dark:text-white">
                  {contactNickname || getContactDisplayName(targetUser)}
                </h4>
                {contactNickname && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Nom officiel: {targetUser?.displayName}
                  </p>
                )}
                {targetUser?.profileTag && (
                  <span className="inline-block mt-1 font-mono text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 dark:bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                    {targetUser.profileTag}
                  </span>
                )}
              </div>
            </div>

            {/* Statut VIP / Standard */}
            <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Statut du compte</span>
                {targetUser?.isVIP ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center gap-1 border border-amber-500/30">
                    <Crown className="w-3.5 h-3.5" /> Membre VIP
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold">
                    Membre Standard
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {targetUser?.isVIP
                  ? 'Ce contact bénéficie du badge VIP officiel my Wahou.'
                  : 'Compte my Wahou standard avec messagerie et appels HD gratuits.'}
              </p>
            </div>

            {/* Bio / Statut text */}
            {targetUser?.statusText && (
              <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-0.5">Bio</span>
                "{targetUser.statusText}"
              </div>
            )}

            <button
              onClick={() => setShowUserInfoModal(false)}
              className="w-full py-2.5 rounded-2xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/15 text-zinc-900 dark:text-white font-bold text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
