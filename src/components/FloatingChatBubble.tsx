import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, ExternalLink, Send, Mic, ChevronDown, Check, CheckCheck, Phone, Video } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { UserProfile, ChatMessage } from '../types';
import { playMessageClickSound, playUiTapSound } from '../utils/soundUtils';

interface FloatingChatBubbleProps {
  lastContact: UserProfile | null;
  unreadCount: number;
  recentMessages?: ChatMessage[];
  currentUserId: string;
  onOpenFullChat: (targetUser: UserProfile) => void;
  onQuickSendMessage?: (targetUser: UserProfile, text: string) => void;
  onStartCall?: (targetUser: UserProfile, isVideo: boolean) => void;
}

export const FloatingChatBubble: React.FC<FloatingChatBubbleProps> = ({
  lastContact,
  unreadCount,
  recentMessages = [],
  currentUserId,
  onOpenFullChat,
  onQuickSendMessage,
  onStartCall,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [quickInput, setQuickInput] = useState('');

  // Draggable coordinates (stored in state, defaults to bottom-right)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });

  // Calculate default position on mount (near bottom right)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultX = Math.max(16, window.innerWidth - 80);
      const defaultY = Math.max(16, window.innerHeight - 150);
      setPosition({ x: defaultX, y: defaultY });
    }
  }, []);

  if (!lastContact || isDismissed || !position) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickInput.trim()) return;
    playMessageClickSound();
    if (onQuickSendMessage) {
      onQuickSendMessage(lastContact, quickInput.trim());
    }
    setQuickInput('');
  };

  // Touch and Mouse drag handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y,
      moved: false,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.moved = true;
    }

    const maxX = window.innerWidth - 68;
    const maxY = window.innerHeight - 80;
    const newX = Math.min(Math.max(12, dragStartRef.current.initialX + dx), maxX);
    const newY = Math.min(Math.max(12, dragStartRef.current.initialY + dy), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // If user tapped without dragging, toggle chat
  const handleBubbleClick = () => {
    if (dragStartRef.current.moved) {
      // It was a drag, not a click!
      dragStartRef.current.moved = false;
      return;
    }
    playMessageClickSound();
    setIsOpen(!isOpen);
  };

  // Determine opacity: exactly 42% (0.42) when resting like iPhone AssistiveTouch!
  // Becomes 100% when hovered, active dragging, or chat window is open.
  const currentOpacity = isOpen || isDragging || isHovered ? 1 : 0.42;

  // Window position relative to bubble (clamp so it stays in viewport)
  const isRightSide = position.x > window.innerWidth / 2;
  const isBottomSide = position.y > window.innerHeight / 2;

  return (
    <div
      id="floating_chat_bubble_root"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        transition: isDragging ? 'none' : 'opacity 0.25s ease',
        opacity: currentOpacity,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseUp={handlePointerUp}
      onTouchMove={(e) => {
        if (e.touches[0]) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handlePointerUp}
      className="pointer-events-auto select-none"
    >
      {/* Expanded Quick-Chat Window */}
      {isOpen && (
        <div
          id="floating_chat_window"
          style={{
            position: 'absolute',
            [isBottomSide ? 'bottom' : 'top']: '64px',
            [isRightSide ? 'right' : 'left']: '0',
          }}
          className="w-80 sm:w-96 h-[420px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-50"
        >
          {/* Header */}
          <div className="p-3 bg-gradient-to-r from-emerald-50 via-white to-white dark:from-emerald-950/80 dark:via-zinc-900 dark:to-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <UserAvatar avatarUrl={lastContact.avatarUrl} name={lastContact.displayName} size="sm" />
                {lastContact.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate flex items-center gap-1">
                  <span>{lastContact.displayName}</span>
                  {lastContact.isVIP && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1 rounded font-bold">VIP</span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                  {lastContact.isOnline ? 'En ligne' : lastContact.profileTag || 'my Wahou'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Quick Audio Call from Bubble */}
              {onStartCall && (
                <button
                  id="floating_chat_audio_call_btn"
                  onClick={() => {
                    playUiTapSound();
                    setIsOpen(false);
                    onStartCall(lastContact, false);
                  }}
                  className="p-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 transition active:scale-95"
                  title="Appel audio depuis la bulle"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Quick Video Call from Bubble */}
              {onStartCall && (
                <button
                  id="floating_chat_video_call_btn"
                  onClick={() => {
                    playUiTapSound();
                    setIsOpen(false);
                    onStartCall(lastContact, true);
                  }}
                  className="p-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-600 dark:text-pink-300 border border-pink-500/30 transition active:scale-95"
                  title="Appel vidéo depuis la bulle"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                id="floating_chat_open_full_btn"
                onClick={() => {
                  playUiTapSound();
                  onOpenFullChat(lastContact);
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                title="Plein écran"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                id="floating_chat_minimize_btn"
                onClick={() => {
                  playUiTapSound();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                title="Réduire"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-zinc-50 dark:bg-zinc-950/60">
            {recentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 space-y-1.5">
                <MessageSquare className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
                <p className="text-xs text-zinc-700 dark:text-zinc-400">Dernière discussion avec {lastContact.displayName}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-600">Écrivez un message rapide, lancez un appel audio/vidéo ou ouvrez le chat complet.</p>
              </div>
            ) : (
              recentMessages.slice(-8).map((m) => {
                const isMe = m.senderId === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-bl-none border border-zinc-200 dark:border-zinc-700/50 shadow-sm'
                      }`}
                    >
                      {m.type === 'voice' ? (
                        <span className="flex items-center gap-1.5">
                          <Mic className="w-3 h-3 text-emerald-300" /> Note vocale ({Math.round(m.audioDuration || 0)}s)
                        </span>
                      ) : (
                        <p className="break-words">{m.content}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] opacity-70">
                        <span>
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && (
                          m.isRead ? (
                            <CheckCheck className="w-3 h-3 text-cyan-300" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-white dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Message rapide..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700/60 rounded-full px-3.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition shadow"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Bubble Trigger Button (Draggable + 42% Resting Opacity) */}
      <div className="relative group cursor-grab active:cursor-grabbing">
        <button
          id="floating_chat_bubble_btn"
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches[0]) {
              handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          onClick={handleBubbleClick}
          className={`relative w-14 h-14 rounded-full p-0.5 shadow-2xl shadow-emerald-950/60 transition-transform active:scale-95 flex items-center justify-center ${
            isOpen
              ? 'ring-4 ring-emerald-500 bg-emerald-500 scale-105'
              : 'ring-2 ring-emerald-500/60 hover:ring-emerald-400 bg-zinc-900 hover:scale-105'
          }`}
          title={`Bulle déplaçable (AssistiveTouch) : ${lastContact.displayName}`}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-zinc-900">
            <UserAvatar
              avatarUrl={lastContact.avatarUrl}
              name={lastContact.displayName}
              size="lg"
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>

          {/* Online status green dot */}
          {lastContact.isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
          )}

          {/* Pastille Rouge / Unread Badge */}
          {unreadCount > 0 && (
            <span
              id="floating_chat_unread_badge"
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-600 border-2 border-zinc-900 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-bounce shadow-lg pointer-events-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dismiss Button on Hover */}
        {!isOpen && (
          <button
            id="floating_chat_dismiss_btn"
            onClick={(e) => {
              e.stopPropagation();
              playUiTapSound();
              setIsDismissed(true);
            }}
            className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-600 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow"
            title="Masquer la bulle"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
