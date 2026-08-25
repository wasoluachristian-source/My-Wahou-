export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  profileTag?: string; // Unique profile identifier e.g. #Spart20@
  avatarUrl: string;
  bio?: string;
  role: UserRole;
  isBlocked: boolean;
  mediaQuota: number; // Number of images/videos user can send
  callMinutes: number; // Number of voice/video call minutes
  isVIP: boolean;
  vipExpiresAt?: number;
  createdAt: number;
  lastSeen: number;
  statusText?: string;
  isOnline?: boolean;
}

export type MessageType = 'text' | 'voice' | 'image' | 'video' | 'call_log';

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface ChatMessageReply {
  id: string;
  senderName: string;
  senderTag?: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: MessageType;
  content: string; // text content or caption
  audioUrl?: string; // base64 or blob URL for voice note
  audioDuration?: number; // in seconds
  mediaUrl?: string; // image or video URL / base64
  mediaType?: 'image' | 'video';
  replyTo?: ChatMessageReply;
  timestamp: number;
  isDelivered: boolean;
  isRead: boolean;
  reactions?: MessageReaction[];
  callInfo?: {
    type: 'audio' | 'video';
    duration: number; // in seconds
    status: 'completed' | 'missed' | 'declined';
  };
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  participantIds: string[];
  participants?: UserProfile[];
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: number;
    type: MessageType;
  };
  unreadCount?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
  avatarUrl?: string;
}

export interface ForfaitPlan {
  id: string;
  name: string;
  tagline: string;
  price: string;
  priceValue: number;
  mediaUnits: number; // 0 for unlimited in VIP
  callMinutes: number;
  isUnlimitedMedia: boolean;
  isUnlimitedCalls: boolean;
  isVIP: boolean;
  validityDays: number;
  badgeColor: string;
  features: string[];
  popular?: boolean;
}

export interface AppSettings {
  appName: string;
  logoUrl: string;
  tagline: string;
  announcement: string;
  showAnnouncement: boolean;
  primaryColor: string; // hex
  freeTextUnlimited: boolean;
  freeVoiceUnlimited: boolean;
  updatedAt: number;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  isVideo: boolean;
  status: 'ringing' | 'connected' | 'ended' | 'declined';
  startTime?: number;
  duration?: number;
}

export type StoryQuality = 'eco' | 'standard' | 'hd';

export interface LiveStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTag?: string;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string; // photo/video url or optional media
  caption?: string; // caption or text content
  textContent?: string; // Text written by user
  textGradient?: string; // Background gradient class or hex e.g. from-violet-600 to-indigo-900
  fontStyle?: 'bold' | 'serif' | 'mono' | 'handwriting';
  quality: StoryQuality;
  durationSeconds?: number;
  timestamp: number;
  expiresAt: number; // 24 hours
  viewsCount?: number;
  reactions?: MessageReaction[];
  // Sponsored ad enhancements from Enterprise partnerships:
  isSponsored?: boolean;
  sponsorName?: string;
  sponsorUrl?: string;
  sponsorBadge?: string;
}

export interface BusinessAd {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  category: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  targetUrl?: string;
  sponsorTag?: string;
  budgetPlan?: string;
  status: 'pending' | 'approved' | 'rejected' | 'posted_live';
  submittedBy: string;
  submittedAt: number;
  approvedAt?: number;
  postedToLiveStoryId?: string;
  stats?: {
    views: number;
    clicks: number;
  };
}

export interface LisangaGroup {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  isPrivate: boolean;
  creatorId: string;
  creatorName: string;
  creatorTag?: string;
  adminIds: string[];
  memberIds: string[];
  membersCount: number;
  rules?: string;
  lastActivity: number;
  createdAt: number;
  isOfficial?: boolean;
}

export interface LisangaMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderTag?: string;
  type: MessageType;
  content: string;
  audioUrl?: string;
  audioDuration?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  replyTo?: ChatMessageReply;
  timestamp: number;
  reactions?: MessageReaction[];
}
