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
  Heart
} from 'lucide-react';
import { UserProfile, ChatMessage, AppSettings, ChatMessageReply } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { UserAvatar } from './UserAvatar';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  sendMessageToDb,
  reactToMessageInDb,
  deleteMessageFromDb,
  markMessagesAsReadInDb,
  setTypingStatusInDb,
  updateUserInDb,
  getContactDisplayName
} from '../services/dbService';
import { compressImageFile } from '../utils/mediaUtils';
import { playMessageSentSound, playMessageClickSound } from '../utils/soundUtils';

interface ChatViewProps {
  conversationId: string;
  currentUser: UserProfile;
  targetUser?: UserProfile;
  messages: ChatMessage[];
  appSettings: AppSettings;
  onStartCall: (isVideo: boolean) => void;
  onOpenForfaitModal: () => void;
}

export function ChatView({
  conversationId,
  currentUser,
  targetUser,
  messages,
  appSettings,
  onStartCall,
  onOpenForfaitModal,
}: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [selectedMessageAction, setSelectedMessageAction] = useState<ChatMessage | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [isTargetTyping, setIsTargetTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Mark incoming messages as read when viewing conversation
  useEffect(() => {
    if (conversationId && currentUser?.id) {
      markMessagesAsReadInDb(conversationId, currentUser.id);
    }
  }, [conversationId, currentUser?.id, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, recordingState.isRecording, isTargetTyping]);

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
      className="flex-1 flex flex-col h-full bg-zinc-950 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Chat Top Header */}
      <header
        id="chat-header"
        className="p-3.5 sm:p-4 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md flex items-center justify-between z-20 shrink-0"
      >
        <div className="flex items-center gap-3">
          <UserAvatar
            name={getContactDisplayName(targetUser)}
            avatarUrl={targetUser?.avatarUrl}
            size="md"
            isOnline={targetUser?.isOnline}
            showOnlineStatus={true}
            isVIP={targetUser?.isVIP}
          />

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">
                {getContactDisplayName(targetUser)}
              </h3>
              {targetUser?.profileTag && (
                <span className="font-mono text-xs font-bold text-violet-300 bg-violet-950/80 px-2 py-0.5 rounded-lg border border-violet-500/30">
                  {targetUser.profileTag}
                </span>
              )}
              {targetUser?.isVIP && (
                <span className="p-0.5 px-1.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                  <Crown className="w-3 h-3" /> VIP
                </span>
              )}
            </div>
            <p className="text-xs flex items-center gap-1.5">
              {targetUser?.isOnline ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  En ligne
                </span>
              ) : (
                <span className="text-zinc-400">
                  {targetUser?.statusText || 'Messagerie gratuite et instantanée'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Call Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Call */}
          <button
            id="start-audio-call-btn"
            onClick={() => onStartCall(false)}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-violet-950/50 text-violet-300 hover:text-white border border-zinc-800 hover:border-violet-500/50 transition active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            title="Appel vocal HD"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Appel</span>
          </button>

          {/* Video Call */}
          <button
            id="start-video-call-btn"
            onClick={() => onStartCall(true)}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-pink-950/50 text-pink-300 hover:text-white border border-zinc-800 hover:border-pink-500/50 transition active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            title="Appel vidéo HD"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Vidéo</span>
          </button>
        </div>
      </header>

      {/* Global Announcement Sub-banner if active */}
      {appSettings.showAnnouncement && appSettings.announcement && (
        <div className="px-4 py-2 bg-gradient-to-r from-violet-950/70 via-zinc-900 to-pink-950/70 border-b border-zinc-800/80 text-xs text-zinc-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-amber-400">📢</span>
            <span className="truncate">{appSettings.announcement}</span>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div
        id="messages-stream"
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 z-10"
      >
        {/* Welcome card for new thread */}
        {messages.length === 0 && (
          <div className="text-center my-12 max-w-sm mx-auto p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-violet-600/30">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-white text-base mb-1">
              Discussion instantanée my Wahou
            </h4>
            <p className="text-xs text-zinc-400 mb-3">
              Envoyez des messages écrits et enregistrez des notes vocales <strong>100% gratuitement</strong> sans aucun forfait.
            </p>
            <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
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
                <div className="px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2 shadow-sm">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
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
                  className={`rounded-3xl p-3.5 shadow-md relative transition-all ${
                    isSelf
                      ? 'bg-gradient-to-br from-violet-700 via-violet-800 to-purple-900 text-white rounded-br-sm border border-violet-500/30'
                      : 'bg-zinc-900/90 text-zinc-100 rounded-bl-sm border border-zinc-800/80 backdrop-blur-md'
                  }`}
                >
                  {/* Sender Name if in group/lisanga or not self */}
                  {!isSelf && (
                    <div className="text-[11px] font-bold text-violet-400 mb-1 flex items-center justify-between gap-2">
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
                      className={`mb-2 p-2 rounded-xl border-l-4 text-xs cursor-pointer select-none transition ${
                        isSelf
                          ? 'border-violet-300 bg-violet-950/70 hover:bg-violet-950 text-violet-100'
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
                    <div className="my-1 rounded-2xl overflow-hidden cursor-pointer relative group/img max-h-72">
                      <img
                        src={msg.mediaUrl}
                        alt="Photo envoyée"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxMedia({ url: msg.mediaUrl!, type: 'image' });
                        }}
                        className="w-full object-cover rounded-2xl hover:scale-102 transition duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                        <Maximize2 className="w-6 h-6" />
                      </div>
                    </div>
                  )}

                  {/* 3. Video Media Message */}
                  {msg.type === 'video' && msg.mediaUrl && (
                    <div className="my-1 rounded-2xl overflow-hidden max-h-72">
                      <video
                        src={msg.mediaUrl}
                        controls
                        className="w-full rounded-2xl bg-black"
                      />
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
                              <CheckCheck className="w-3.5 h-3.5 text-zinc-300" title="Distribué (Non lu)" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-zinc-400" title="Envoyé" />
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

      {/* Hidden File Input for Image/Video */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Chat Bottom Input Bar */}
      <footer
        id="chat-input-bar"
        className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md z-20 shrink-0"
      >
        {/* Replying Banner */}
        {replyingToMessage && (
          <div className="mb-2 p-2 px-3 rounded-2xl bg-violet-950/70 border border-violet-500/40 flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1 rounded-lg bg-violet-600/30 text-violet-300 shrink-0">
                <Reply className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs overflow-hidden">
                <div className="font-bold text-violet-200 text-[11px] truncate">
                  Réponse à {replyingToMessage.senderId === currentUser.id ? 'Vous' : replyingToMessage.senderName}
                </div>
                <div className="text-[11px] text-zinc-300 truncate">
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
              onClick={() => setReplyingToMessage(null)}
              className="p-1.5 rounded-xl hover:bg-violet-900/60 text-zinc-400 hover:text-white transition shrink-0"
              title="Annuler la réponse"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* If audio is currently recording */}
        {recordingState.isRecording ? (
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-violet-950/40 border border-violet-500/40 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white animate-ping">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Enregistrement vocal gratuit (iPhone & Android)...</span>
                  <span className="font-mono text-pink-400">
                    {Math.floor(recordingState.duration / 60)}:
                    {(recordingState.duration % 60).toFixed(0).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold">
                  ✓ 100% Gratuit sans forfait
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="cancel-voice-btn"
                onClick={cancelRecording}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                title="Annuler l'enregistrement"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                id="send-voice-btn"
                onClick={handleSendVoice}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/30"
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
              onClick={handleTriggerMediaUpload}
              disabled={isUploadingMedia}
              className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-pink-400 transition shrink-0 relative group"
              title="Envoyer Photo / Vidéo (Forfait Médias)"
            >
              <ImageIcon className="w-5 h-5" />
              {!currentUser.isVIP && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-pink-600 text-white">
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
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            {/* If text is typed, show Send button; otherwise show Mic button */}
            {inputText.trim() ? (
              <button
                id="send-text-message-btn"
                type="submit"
                className="p-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-600/30 hover:opacity-90 transition active:scale-95 shrink-0"
                title="Envoyer le message (Gratuit)"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                id="start-voice-recording-btn"
                type="button"
                onClick={startRecording}
                className="p-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 hover:scale-105 transition active:scale-95 shrink-0"
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
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="text-xs font-bold text-zinc-400">
                Options du message ({selectedMessageAction.senderId === currentUser.id ? 'Vous' : selectedMessageAction.senderName})
              </div>
              <button
                onClick={() => setSelectedMessageAction(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emojis row */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                Ajouter une réaction
              </label>
              <div className="flex items-center justify-between gap-1 p-2 bg-zinc-950 rounded-2xl border border-zinc-800">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(selectedMessageAction.id, emoji)}
                    className="w-9 h-9 rounded-xl hover:bg-zinc-800 text-xl transition flex items-center justify-center active:scale-125"
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

      {/* Lightbox for Image/Video preview */}
      {lightboxMedia && (
        <div
          id="media-lightbox"
          onClick={() => setLightboxMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightboxMedia(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxMedia.url}
            alt="Preview"
            className="max-w-full max-h-[85vh] rounded-3xl object-contain shadow-2xl border border-zinc-800"
          />
        </div>
      )}
    </div>
  );
}
