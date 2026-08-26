import React, { useEffect } from 'react';
import { MessageSquare, X, ArrowRight, Mic, Image, Video, PhoneCall } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { UserProfile, MessageType } from '../types';

export interface WhatsAppPushData {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderTag?: string;
  content: string;
  type: MessageType;
  conversationId: string;
  targetUser?: UserProfile;
  timestamp: number;
}

interface WhatsAppPushBannerProps {
  push: WhatsAppPushData | null;
  onOpenChat: (convoId: string, targetUser?: UserProfile) => void;
  onClose: () => void;
}

export const WhatsAppPushBanner: React.FC<WhatsAppPushBannerProps> = ({
  push,
  onOpenChat,
  onClose,
}) => {
  useEffect(() => {
    if (!push) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [push, onClose]);

  if (!push) return null;

  const renderContentPreview = () => {
    if (push.type === 'voice') {
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <Mic className="w-3.5 h-3.5" /> Note vocale reçue
        </span>
      );
    }
    if (push.type === 'image') {
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <Image className="w-3.5 h-3.5" /> Photo reçue
        </span>
      );
    }
    if (push.type === 'video') {
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <Video className="w-3.5 h-3.5" /> Vidéo reçue
        </span>
      );
    }
    if (push.type === 'call_log') {
      return (
        <span className="flex items-center gap-1.5 text-amber-400 font-medium">
          <PhoneCall className="w-3.5 h-3.5" /> Appel my Wahou
        </span>
      );
    }
    return <span className="text-zinc-200 line-clamp-1">{push.content}</span>;
  };

  return (
    <div
      id="whatsapp_push_banner_container"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-11/12 max-w-md animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div
        id="whatsapp_push_card"
        onClick={() => {
          onOpenChat(push.conversationId, push.targetUser);
          onClose();
        }}
        className="relative bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl shadow-emerald-950/40 cursor-pointer hover:border-emerald-500 transition group overflow-hidden"
      >
        {/* Top subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        <div className="flex items-center justify-between gap-3">
          {/* Avatar with Status indicator */}
          <div className="relative flex-shrink-0">
            <UserAvatar
              avatarUrl={push.senderAvatar}
              name={push.senderName}
              size="md"
              className="ring-2 ring-emerald-500/30"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
          </div>

          {/* Message preview text */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                {push.senderName}
                {push.senderTag && (
                  <span className="text-[10px] font-mono text-emerald-400/80 font-normal">
                    {push.senderTag}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {new Date(push.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="text-xs mt-0.5">{renderContentPreview()}</div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              id="whatsapp_push_reply_btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChat(push.conversationId, push.targetUser);
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition"
            >
              <span>Ouvrir</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              id="whatsapp_push_close_btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6s auto-dismiss progress bar */}
        <div className="mt-2.5 h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500/80 animate-[shrink_6s_linear_forwards]" />
        </div>
      </div>
    </div>
  );
};
