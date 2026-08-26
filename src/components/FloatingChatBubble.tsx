import React, { useState } from 'react';
import { MessageSquare, X, ExternalLink, Send, Mic, Sparkles, ChevronDown, Check, CheckCheck } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { UserProfile, ChatMessage } from '../types';
import { playMessageClickSound } from '../utils/soundUtils';

interface FloatingChatBubbleProps {
  lastContact: UserProfile | null;
  unreadCount: number;
  recentMessages?: ChatMessage[];
  currentUserId: string;
  onOpenFullChat: (targetUser: UserProfile) => void;
  onQuickSendMessage?: (targetUser: UserProfile, text: string) => void;
}

export const FloatingChatBubble: React.FC<FloatingChatBubbleProps> = ({
  lastContact,
  unreadCount,
  recentMessages = [],
  currentUserId,
  onOpenFullChat,
  onQuickSendMessage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [quickInput, setQuickInput] = useState('');

  if (!lastContact || isDismissed) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickInput.trim()) return;
    playMessageClickSound();
    if (onQuickSendMessage) {
      onQuickSendMessage(lastContact, quickInput.trim());
    }
    setQuickInput('');
  };

  return (
    <div
      id="floating_chat_bubble_root"
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto select-none"
    >
      {/* Expanded Quick-Chat Window */}
      {isOpen && (
        <div
          id="floating_chat_window"
          className="mb-3 w-80 sm:w-96 h-[420px] bg-zinc-900/95 backdrop-blur-2xl border border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <UserAvatar avatarUrl={lastContact.avatarUrl} name={lastContact.displayName} size="sm" />
                {lastContact.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span>{lastContact.displayName}</span>
                  {lastContact.isVIP && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">VIP</span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono truncate">
                  {lastContact.isOnline ? 'En ligne' : lastContact.profileTag || 'my Wahou'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="floating_chat_open_full_btn"
                onClick={() => {
                  onOpenFullChat(lastContact);
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Plein écran"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                id="floating_chat_minimize_btn"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Réduire"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-zinc-950/60">
            {recentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 space-y-1.5">
                <MessageSquare className="w-6 h-6 text-zinc-600" />
                <p className="text-xs">Dernière discussion avec {lastContact.displayName}</p>
                <p className="text-[10px] text-zinc-600">Écrivez un message rapide ou ouvrez le chat complet.</p>
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
                          : 'bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700/50'
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
            className="p-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2"
          >
            <input
              id="floating_chat_quick_input"
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={`Message à ${lastContact.displayName.split(' ')[0]}...`}
              className="flex-1 bg-zinc-800/90 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
            <button
              id="floating_chat_send_btn"
              type="submit"
              disabled={!quickInput.trim()}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white transition flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* The Floating Circular Bubble (Chat Head) */}
      <div className="relative group flex items-center">
        {/* Hover Label with Contact Name */}
        {!isOpen && (
          <div className="mr-3 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-200 shadow-xl opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none hidden sm:block whitespace-nowrap">
            {lastContact.displayName}
            {unreadCount > 0 && ` (${unreadCount})`}
          </div>
        )}

        {/* Bubble Button */}
        <button
          id="floating_chat_bubble_btn"
          onClick={() => {
            playMessageClickSound();
            setIsOpen(!isOpen);
          }}
          className={`relative w-14 h-14 rounded-full p-0.5 shadow-2xl shadow-emerald-950/60 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center ${
            isOpen
              ? 'ring-4 ring-emerald-500 bg-emerald-500'
              : 'ring-2 ring-emerald-500/60 hover:ring-emerald-400 bg-zinc-900'
          }`}
          title={`Dernière discussion : ${lastContact.displayName}`}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-zinc-900">
            <UserAvatar
              avatarUrl={lastContact.avatarUrl}
              name={lastContact.displayName}
              size="lg"
              className="w-full h-full object-cover"
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
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-600 border-2 border-zinc-900 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-bounce shadow-lg"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Small dismiss button on hover */}
        {!isOpen && (
          <button
            id="floating_chat_dismiss_btn"
            onClick={(e) => {
              e.stopPropagation();
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
