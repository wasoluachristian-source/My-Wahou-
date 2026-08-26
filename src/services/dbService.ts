import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  UserProfile,
  ChatMessage,
  Conversation,
  AppSettings,
  LiveStory,
  BusinessAd,
  LisangaGroup,
  LisangaMessage,
  FirebaseDatabaseStats,
  FirebaseCollectionSummary
} from '../types';

/**
 * Nettoie récursivement tous les champs `undefined` d'un objet
 * pour empêcher les erreurs fatales de Firestore SDK ("Unsupported field value: undefined")
 */
export function cleanObjectForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanObjectForFirestore(item))
      .filter(item => item !== undefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        res[key] = cleanObjectForFirestore(value);
      }
    }
    return res as unknown as T;
  }
  return obj;
}

export const ADMIN_EMAIL = 'wasoluachristian@gmail.com';
export const ADMIN_PASS = 'Spart3435';
export const ADMIN_PROFILE_TAG = '#Spart20@';

export const isUserAdmin = (user?: UserProfile | null): boolean => {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

/**
 * Génère un identifiant utilisateur déterministe et pérenne basé sur l'email
 * pour garantir qu'aucune discussion ou sauvegarde ne soit perdue lors d'une reconnexion.
 */
export const getDeterministicUserId = (email: string, existingUsers: UserProfile[] = []): string => {
  const emailClean = email.trim().toLowerCase();
  if (emailClean === ADMIN_EMAIL.toLowerCase()) {
    return 'admin_christian_wasolua';
  }
  const existing = existingUsers.find((u) => u.email?.toLowerCase() === emailClean);
  if (existing?.id) {
    return existing.id;
  }
  const safeEmail = emailClean.replace(/[^a-z0-9]/g, '_');
  return `usr_${safeEmail}`;
};

export const normalizeProfileTag = (rawTag: string): string => {
  if (!rawTag) return '';
  let cleaned = rawTag.trim().replace(/^#+/, '').replace(/@+$/, '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return '';
  return `#${cleaned}@`;
};

export const generateDefaultProfileTag = (displayName: string, existingUsers: UserProfile[] = []): string => {
  let base = displayName.trim().replace(/[^a-zA-Z0-9]/g, '');
  if (!base) base = 'User';
  let tag = `#${base}${Math.floor(10 + Math.random() * 89)}@`;
  let counter = 1;
  while (existingUsers.some(u => u.profileTag?.toLowerCase() === tag.toLowerCase())) {
    tag = `#${base}${Math.floor(10 + Math.random() * 890)}@`;
    counter++;
    if (counter > 20) break;
  }
  return tag;
};

export const isProfileTagAvailable = (tag: string, allUsers: UserProfile[], currentUserId?: string): boolean => {
  const normalized = normalizeProfileTag(tag).toLowerCase();
  if (!normalized || normalized.length < 4) return false;
  return !allUsers.some(u => u.id !== currentUserId && u.profileTag?.toLowerCase() === normalized);
};

/**
 * Calcule le nom d'affichage idéal pour un contact ou une discussion :
 * 1. Utilise le nom de profil (displayName) s'il est renseigné et personnalisé.
 * 2. Si le nom de profil n'a pas encore été mis à jour (ou est générique / vide / "Discussion"),
 *    utilise le début du compte Gmail (la partie avant le @, ex: "wasoluachristian" pour "wasoluachristian@gmail.com").
 * 3. En secours, utilise l'identifiant unique (#Tag@) ou l'identifiant utilisateur.
 */
export const getContactDisplayName = (
  participant?: Partial<UserProfile> | null,
  convo?: Partial<Conversation> | null,
  fallbackOtherId?: string
): string => {
  if (participant) {
    const rawName = (participant.displayName || '').trim();
    const isGeneric =
      !rawName ||
      rawName.toLowerCase() === 'discussion' ||
      rawName.toLowerCase() === 'nouvelle discussion' ||
      rawName.toLowerCase() === 'utilisateur' ||
      rawName.toLowerCase() === 'user' ||
      rawName.toLowerCase() === 'contact' ||
      rawName.toLowerCase() === 'nouveau membre';

    // 1. Nom de profil personnalisé
    if (!isGeneric) {
      return rawName;
    }

    // 2. Si le profil n'est pas encore mis à jour : début du compte Gmail / email
    if (participant.email && participant.email.includes('@')) {
      const emailPrefix = participant.email.split('@')[0].trim();
      if (emailPrefix) {
        return emailPrefix;
      }
    }

    // 3. Identifiant unique (#Tag@)
    if (participant.profileTag) {
      const cleanTag = participant.profileTag.replace(/^#+/, '').replace(/@+$/, '').trim();
      if (cleanTag) return cleanTag;
      return participant.profileTag;
    }

    if (rawName) return rawName;
  }

  // Si la conversation a un nom personnalisé non générique
  if (convo?.name) {
    const trimmed = convo.name.trim();
    if (
      trimmed &&
      trimmed.toLowerCase() !== 'discussion' &&
      trimmed.toLowerCase() !== 'nouvelle discussion'
    ) {
      return trimmed;
    }
  }

  // Si on a l'identifiant ou un email de secours
  if (fallbackOtherId) {
    if (fallbackOtherId.includes('@')) {
      return fallbackOtherId.split('@')[0];
    }
    const emailMatch = fallbackOtherId.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1].split('@')[0];
    }
    const cleanId = fallbackOtherId.replace(/^user_/, '').replace(/^direct_/, '');
    if (cleanId && !cleanId.startsWith('17') && cleanId.length > 2) {
      return cleanId;
    }
  }

  return 'Contact';
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'my Wahou',
  logoUrl: '',
  tagline: 'Messagerie nouvelle génération sans forfait texte et vocal',
  announcement: '📢 Bienvenue sur my Wahou ! Messages texte et notes vocales 100% gratuits & illimités.',
  showAnnouncement: true,
  primaryColor: '#7C3AED',
  freeTextUnlimited: true,
  freeVoiceUnlimited: true,
  updatedAt: Date.now(),
};

// Initial admin account only - No fake default accounts
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'admin_christian_wasolua',
    email: 'wasoluachristian@gmail.com',
    displayName: 'Christian Wasolua (Admin)',
    profileTag: ADMIN_PROFILE_TAG,
    avatarUrl: '',
    bio: '⚡ Administrateur Principal my Wahou',
    role: 'admin',
    isBlocked: false,
    mediaQuota: 9999,
    callMinutes: 9999,
    isVIP: true,
    createdAt: Date.now() - 86400000 * 30,
    lastSeen: Date.now(),
    statusText: '🛡️ Administrateur Réseau',
    isOnline: true
  }
];

const FAKE_ACCOUNT_IDS = ['admin_spart', 'user_aicha', 'user_malik', 'user_sophie'];
const FAKE_ACCOUNT_EMAILS = ['spart@gmail.com', 'aicha.diallo@wahou.app', 'malik.k@wahou.app', 'sophie.m@wahou.app'];

// ==========================================
// APP SETTINGS
// ==========================================
export const subscribeAppSettings = (callback: (settings: AppSettings) => void) => {
  const docRef = doc(db, 'settings', 'global_config');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as AppSettings);
    } else {
      setDoc(docRef, cleanObjectForFirestore(DEFAULT_APP_SETTINGS)).catch(console.error);
      callback(DEFAULT_APP_SETTINGS);
    }
  }, (error) => {
    console.warn('Using local settings due to firestore error:', error);
    callback(DEFAULT_APP_SETTINGS);
  });
};

export const updateAppSettingsInDb = async (newSettings: Partial<AppSettings>) => {
  const docRef = doc(db, 'settings', 'global_config');
  await setDoc(docRef, cleanObjectForFirestore({ ...newSettings, updatedAt: Date.now() }), { merge: true });
};

// ==========================================
// USERS & PRESENCE
// ==========================================
export const subscribeAllUsers = (callback: (users: UserProfile[]) => void) => {
  const colRef = collection(db, 'users');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const allDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
      
      const validUsers: UserProfile[] = [];
      for (const u of allDocs) {
        const emailLower = (u.email || '').toLowerCase().trim();
        if (
          FAKE_ACCOUNT_IDS.includes(u.id) ||
          FAKE_ACCOUNT_EMAILS.includes(emailLower) ||
          emailLower.includes('@wahou.app') ||
          emailLower === 'spart@gmail.com'
        ) {
          deleteDoc(doc(db, 'users', u.id)).catch(() => {});
        } else {
          let profileTag = u.profileTag ? normalizeProfileTag(u.profileTag) : '';

          if (emailLower === ADMIN_EMAIL.toLowerCase()) {
            validUsers.push({
              ...u,
              profileTag: profileTag || ADMIN_PROFILE_TAG,
              role: 'admin',
              isVIP: true,
              mediaQuota: 9999,
              callMinutes: 9999
            });
          } else {
            if (!profileTag) {
              profileTag = generateDefaultProfileTag(u.displayName || 'User', validUsers);
            }
            validUsers.push({
              ...u,
              profileTag,
              role: 'user'
            });
          }
        }
      }

      const hasAdmin = validUsers.some(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (!hasAdmin) {
        setDoc(doc(db, 'users', INITIAL_USERS[0].id), INITIAL_USERS[0]).catch(console.error);
        validUsers.unshift(INITIAL_USERS[0]);
      }

      callback(validUsers);
    } else {
      INITIAL_USERS.forEach(user => {
        setDoc(doc(db, 'users', user.id), user).catch(console.error);
      });
      callback(INITIAL_USERS);
    }
  }, (error) => {
    console.warn('Using initial users fallback:', error);
    callback(INITIAL_USERS);
  });
};

export const saveUserToDb = async (user: UserProfile) => {
  const emailLower = (user.email || '').toLowerCase().trim();
  const rawTag = user.profileTag || generateDefaultProfileTag(user.displayName);
  const profileTag = emailLower === ADMIN_EMAIL.toLowerCase() ? ADMIN_PROFILE_TAG : normalizeProfileTag(rawTag);

  const securedUser: UserProfile = {
    ...user,
    profileTag,
    role: emailLower === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
    isVIP: emailLower === ADMIN_EMAIL.toLowerCase() ? true : (user.isVIP || false),
    mediaQuota: emailLower === ADMIN_EMAIL.toLowerCase() ? 9999 : (user.mediaQuota ?? 5),
    callMinutes: emailLower === ADMIN_EMAIL.toLowerCase() ? 9999 : (user.callMinutes ?? 10)
  };
  const docRef = doc(db, 'users', securedUser.id);
  await setDoc(docRef, cleanObjectForFirestore(securedUser), { merge: true });
};

export const updateUserInDb = async (userId: string, updates: Partial<UserProfile>) => {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, cleanObjectForFirestore(updates));
};

export const updateUserPresenceInDb = async (userId: string, isOnline: boolean) => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      isOnline,
      lastSeen: Date.now()
    });
  } catch {
    // Ignore presence errors on unmount
  }
};

export const deleteUserFromDb = async (userId: string) => {
  const docRef = doc(db, 'users', userId);
  await deleteDoc(docRef);
};

// ==========================================
// CONVERSATIONS & DIRECT CHATS
// ==========================================
const LOCAL_CONVOS_CACHE_KEY = 'mywahou_cached_convos_';
const LOCAL_MESSAGES_CACHE_PREFIX = 'mywahou_cached_msgs_';
const OFFLINE_MSG_QUEUE_KEY = 'mywahou_offline_msg_queue';

/**
 * Récupère le cache local des messages pour une discussion donnée
 */
export const getCachedMessages = (conversationId: string): ChatMessage[] => {
  if (typeof window === 'undefined' || !conversationId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_CACHE_PREFIX}${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Error reading local messages cache:', e);
    return [];
  }
};

/**
 * Sauvegarde les messages d'une discussion dans le cache local
 */
export const setCachedMessages = (conversationId: string, messages: ChatMessage[]) => {
  if (typeof window === 'undefined' || !conversationId) return;
  try {
    localStorage.setItem(`${LOCAL_MESSAGES_CACHE_PREFIX}${conversationId}`, JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving local messages cache:', e);
  }
};

/**
 * Récupère le cache local des conversations pour un affichage instantané et anti-perte
 */
export const getCachedUserConversations = (userId: string): Conversation[] => {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_CONVOS_CACHE_KEY}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local conversations cache:', e);
  }
  return [];
};

/**
 * Sauvegarde les conversations dans le cache local
 */
export const setCachedUserConversations = (userId: string, convos: Conversation[]) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`${LOCAL_CONVOS_CACHE_KEY}${userId}`, JSON.stringify(convos));
  } catch (e) {
    console.warn('Error saving local conversations cache:', e);
  }
};

/**
 * Souscription en temps réel aux conversations de l'utilisateur avec résilience totale et fusion anti-perte
 */
export const subscribeUserConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void,
  userEmail?: string
) => {
  // 1. Émettre immédiatement le cache local existant pour zéro délai d'affichage
  const cached = getCachedUserConversations(userId);
  if (cached.length > 0) {
    callback(cached);
  }

  const colRef = collection(db, 'conversations');
  const q = query(colRef, where('participantIds', 'array-contains', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const liveConvos = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id } as Conversation)
      );

      // Fusion intelligente avec le cache local existant : on ne supprime jamais une conversation locale sans raison
      const convosMap = new Map<string, Conversation>();
      cached.forEach((c) => convosMap.set(c.id, c));
      liveConvos.forEach((c) => convosMap.set(c.id, c));

      const finalConvos = Array.from(convosMap.values());
      finalConvos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      setCachedUserConversations(userId, finalConvos);
      callback(finalConvos);
    },
    (error) => {
      console.warn('Firestore convos query error, fallback to local resilient cache:', error);
      const fallback = getCachedUserConversations(userId);
      callback(fallback);
    }
  );
};

/**
 * Souscription administrateur à toutes les conversations de la plateforme
 */
export const subscribeToAllConversationsAdmin = (
  callback: (conversations: Conversation[]) => void
) => {
  const colRef = collection(db, 'conversations');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const convos = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Conversation));
      convos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      callback(convos);
    },
    (err) => {
      console.warn('Error subscribing to all admin conversations:', err);
      callback([]);
    }
  );
};

export const createOrGetDirectConversation = async (
  currentUserId: string,
  targetUser: UserProfile,
  currentUserEmail?: string
): Promise<string> => {
  const sortedIds = [currentUserId, targetUser.id].sort();
  const convoId = `direct_${sortedIds.join('_')}`;
  const docRef = doc(db, 'conversations', convoId);
  
  // Robust participant list with both IDs and lowercased emails for bulletproof querying
  const pIds = Array.from(
    new Set(
      [
        currentUserId,
        targetUser.id,
        currentUserEmail?.toLowerCase().trim(),
        targetUser.email?.toLowerCase().trim(),
      ].filter(Boolean) as string[]
    )
  );

  try {
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      const newConvo: Conversation = {
        id: convoId,
        isGroup: false,
        participantIds: pIds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        unreadCount: {
          [currentUserId]: 0,
          [targetUser.id]: 0,
        },
        lastMessage: {
          text: '👋 Nouvelle conversation lancée sur my Wahou',
          senderName: 'my Wahou',
          timestamp: Date.now(),
          type: 'text',
          isRead: true,
        },
      };
      await setDoc(docRef, cleanObjectForFirestore(newConvo));
      
      // Update local cache
      const cached = getCachedUserConversations(currentUserId);
      if (!cached.some(c => c.id === convoId)) {
        setCachedUserConversations(currentUserId, [newConvo, ...cached]);
      }
    } else {
      // Ensure participantIds contains all IDs and emails
      const existingData = snap.data() as Conversation;
      const currentParticipants = existingData.participantIds || [];
      const missing = pIds.filter((id) => !currentParticipants.includes(id));
      if (missing.length > 0) {
        await updateDoc(docRef, {
          participantIds: Array.from(new Set([...currentParticipants, ...pIds])),
        });
      }
    }
  } catch (err) {
    console.warn('Firestore direct convo create error, optimistic fallback:', err);
  }

  return convoId;
};

// ==========================================
// OFFLINE QUEUE & SYNC ENGINE
// ==========================================
export const getOfflineMessageQueue = (): ChatMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_MSG_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineMessageQueue = (queue: ChatMessage[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_MSG_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
};

/**
 * Vide la file d'attente hors-ligne dès que la connexion réseau est disponible
 */
export const processOfflineMessageQueue = async () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const queue = getOfflineMessageQueue();
  if (queue.length === 0) return;

  const remaining: ChatMessage[] = [];
  for (const msg of queue) {
    try {
      const msgDocRef = doc(db, 'messages', msg.id);
      await setDoc(msgDocRef, cleanObjectForFirestore({ ...msg, offlineSyncStatus: 'synced' }));
      
      // Update conversation doc
      const convoDocRef = doc(db, 'conversations', msg.conversationId);
      const convoSnap = await getDoc(convoDocRef);
      if (convoSnap.exists()) {
        await updateDoc(convoDocRef, {
          updatedAt: msg.timestamp,
          lastMessage: {
            text: msg.content,
            senderName: msg.senderName,
            senderId: msg.senderId,
            timestamp: msg.timestamp,
            type: msg.type,
            isRead: false,
          },
        });
      }
    } catch (err) {
      console.warn('Failed to sync queued offline message, retaining in queue:', err);
      remaining.push(msg);
    }
  }
  saveOfflineMessageQueue(remaining);
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOfflineMessageQueue().catch(console.error);
  });
}

// ==========================================
// MESSAGES & READ RECEIPTS & TYPING
// ==========================================
export const subscribeMessages = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  if (!conversationId) {
    callback([]);
    return () => {};
  }

  // 1. Émettre immédiatement les messages du cache local pour zéro temps d'attente et anti-perte
  const cached = getCachedMessages(conversationId);
  if (cached.length > 0) {
    callback(cached);
  }

  const colRef = collection(db, 'messages');
  const q = query(colRef, where('conversationId', '==', conversationId));

  return onSnapshot(
    q,
    (snapshot) => {
      const liveMsgs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ChatMessage));
      
      // Fusion intelligente entre le cache local et les messages du serveur
      const msgMap = new Map<string, ChatMessage>();
      cached.forEach((m) => msgMap.set(m.id, m));
      liveMsgs.forEach((m) => msgMap.set(m.id, m));

      const mergedMsgs = Array.from(msgMap.values());
      mergedMsgs.sort((a, b) => a.timestamp - b.timestamp);

      setCachedMessages(conversationId, mergedMsgs);
      callback(mergedMsgs);
    },
    (error) => {
      console.warn('Firestore messages error, fallback to local cache:', error);
      const fallback = getCachedMessages(conversationId);
      callback(fallback);
    }
  );
};

export const sendMessageToDb = async (message: ChatMessage, targetUserId?: string) => {
  // 1. Mettre immédiatement à jour le cache local des messages pour un affichage instantané
  try {
    const existingCached = getCachedMessages(message.conversationId);
    if (!existingCached.some(m => m.id === message.id)) {
      const updated = [...existingCached, message];
      updated.sort((a, b) => a.timestamp - b.timestamp);
      setCachedMessages(message.conversationId, updated);
    }
  } catch (err) {
    console.warn('Error updating local message cache:', err);
  }

  // 2. Save message in Firestore
  const msgDocRef = doc(db, 'messages', message.id);
  await setDoc(msgDocRef, cleanObjectForFirestore(message));

  // 3. Format lastMessage label
  let lastText = message.content;
  if (message.type === 'voice') lastText = `🎤 Note vocale (${Math.round(message.audioDuration || 0)}s)`;
  if (message.type === 'image') lastText = '🖼️ Photo';
  if (message.type === 'video') lastText = '🎬 Vidéo';
  if (message.type === 'call_log') lastText = `📞 ${message.content}`;

  // 4. Update Conversation doc
  const convoDocRef = doc(db, 'conversations', message.conversationId);
  try {
    const convoSnap = await getDoc(convoDocRef);
    if (convoSnap.exists()) {
      const convoData = convoSnap.data() as Conversation;
      const currentUnread = convoData.unreadCount || {};
      const participantIds = convoData.participantIds || [message.senderId];

      // Increment unread count for other participants
      const nextUnread: Record<string, number> = { ...currentUnread };
      participantIds.forEach((pid) => {
        if (pid !== message.senderId) {
          nextUnread[pid] = (nextUnread[pid] || 0) + 1;
        }
      });

      await updateDoc(
        convoDocRef,
        cleanObjectForFirestore({
          updatedAt: message.timestamp,
          unreadCount: nextUnread,
          lastMessage: {
            text: lastText,
            senderName: message.senderName,
            senderId: message.senderId,
            timestamp: message.timestamp,
            type: message.type,
            isRead: false,
          },
        })
      );
    } else {
      // Create fresh conversation if doesn't exist
      const pIds = targetUserId
        ? Array.from(new Set([message.senderId, targetUserId]))
        : [message.senderId];
      const initialUnread: Record<string, number> = {};
      if (targetUserId) {
        initialUnread[targetUserId] = 1;
      }
      await setDoc(
        convoDocRef,
        cleanObjectForFirestore({
          id: message.conversationId,
          participantIds: pIds,
          isGroup: false,
          updatedAt: message.timestamp,
          createdAt: message.timestamp,
          unreadCount: initialUnread,
          lastMessage: {
            text: lastText,
            senderName: message.senderName,
            senderId: message.senderId,
            timestamp: message.timestamp,
            type: message.type,
            isRead: false,
          },
        })
      );
    }
  } catch (err) {
    console.error('Error updating conversation on message send:', err);
  }
};

/**
 * Marque tous les messages non lus d'une conversation comme "Vus" par l'utilisateur actif
 */
export const markMessagesAsReadInDb = async (conversationId: string, currentUserId: string) => {
  try {
    // 1. Reset unread count for current user on conversation document
    const convoDocRef = doc(db, 'conversations', conversationId);
    const convoSnap = await getDoc(convoDocRef);
    if (convoSnap.exists()) {
      const convoData = convoSnap.data() as Conversation;
      const unreadMap = convoData.unreadCount || {};
      if (unreadMap[currentUserId] && unreadMap[currentUserId] > 0) {
        const updatedMap = { ...unreadMap, [currentUserId]: 0 };
        await updateDoc(convoDocRef, { unreadCount: updatedMap });
      }
    }

    // 2. Mark unread messages sent by others as read
    const msgsRef = collection(db, 'messages');
    const q = query(
      msgsRef,
      where('conversationId', '==', conversationId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((d) => {
        const data = d.data() as ChatMessage;
        if (data.senderId !== currentUserId) {
          const currentReadBy = data.readBy || [];
          const readBy = currentReadBy.includes(currentUserId)
            ? currentReadBy
            : [...currentReadBy, currentUserId];

          batch.update(d.ref, {
            isRead: true,
            readBy,
            readAt: Date.now(),
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn('markMessagesAsReadInDb warning:', err);
  }
};

export const setTypingStatusInDb = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
) => {
  try {
    const convoDocRef = doc(db, 'conversations', conversationId);
    await updateDoc(convoDocRef, {
      [`typingUsers.${userId}`]: isTyping ? Date.now() : 0,
    });
  } catch {
    // ignore
  }
};

export const reactToMessageInDb = async (
  messageId: string,
  reaction: { userId: string; emoji: string }
) => {
  const docRef = doc(db, 'messages', messageId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as ChatMessage;
    const currentReactions = data.reactions || [];
    // Toggle: if same user already reacted with this emoji, remove it; otherwise replace/add
    const existingIndex = currentReactions.findIndex(
      (r) => r.userId === reaction.userId && r.emoji === reaction.emoji
    );
    let updated: { userId: string; emoji: string }[];
    if (existingIndex >= 0) {
      updated = currentReactions.filter((_, idx) => idx !== existingIndex);
    } else {
      const withoutUser = currentReactions.filter((r) => r.userId !== reaction.userId);
      updated = [...withoutUser, reaction];
    }
    await updateDoc(docRef, cleanObjectForFirestore({ reactions: updated }));
  }
};

export const deleteMessageFromDb = async (messageId: string) => {
  const docRef = doc(db, 'messages', messageId);
  await deleteDoc(docRef);
};

// ==========================================
// JOURNÉE LIVE (STORIES 24H)
// ==========================================
export const subscribeLiveStories = (callback: (stories: LiveStory[]) => void) => {
  const colRef = collection(db, 'stories');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const now = Date.now();
      const allStories = snapshot.docs
        .map((d) => ({ ...d.data(), id: d.id } as LiveStory))
        .filter((s) => (s.expiresAt || 0) > now);

      allStories.sort((a, b) => b.timestamp - a.timestamp);
      callback(allStories);
    },
    (err) => {
      console.warn('Firestore stories error:', err);
      callback([]);
    }
  );
};

export const postLiveStoryToDb = async (story: LiveStory) => {
  const docRef = doc(db, 'stories', story.id);
  await setDoc(docRef, cleanObjectForFirestore(story));
};

export const deleteLiveStoryFromDb = async (storyId: string) => {
  const docRef = doc(db, 'stories', storyId);
  await deleteDoc(docRef);
};

export const reactToLiveStoryInDb = async (
  storyId: string,
  reaction: { userId: string; emoji: string }
) => {
  const docRef = doc(db, 'stories', storyId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as LiveStory;
    const currentReactions = data.reactions || [];
    const filtered = currentReactions.filter((r) => r.userId !== reaction.userId);
    filtered.push(reaction);
    await updateDoc(docRef, cleanObjectForFirestore({ reactions: filtered }));
  }
};

// ==========================================
// ESPACE ENTREPRISE (PUBLICITÉS & PARTENARIATS)
// ==========================================
export const INITIAL_BUSINESS_ADS: BusinessAd[] = [
  {
    id: 'ad_kin_express',
    companyName: 'Kinshasa Express Delivery',
    contactEmail: 'contact@kinexpress.com',
    contactPhone: '+243 81 234 5678',
    category: 'Logistique & Transport',
    title: 'Livraison Rapide Express à Domicile',
    description:
      'Bénéficiez de 20% de réduction sur votre première commande avec le code WAHOU20 ! Service disponible 7j/7.',
    mediaUrl:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    targetUrl: 'https://wa.me/243812345678',
    sponsorTag: 'OFFRE PARTENAIRE',
    budgetPlan: '24h Live Sponsorisé',
    status: 'approved',
    submittedBy: 'user_kin_business',
    submittedAt: Date.now() - 3600000 * 5,
    approvedAt: Date.now() - 3600000 * 2,
    stats: { views: 420, clicks: 58 },
  },
  {
    id: 'ad_wahou_tech',
    companyName: 'Wastus Spart Studios',
    contactEmail: 'wasoluachristian@gmail.com',
    contactPhone: '+33 6 00 00 00 00',
    category: 'Technologie & Mobile',
    title: 'Développement Web & Applications 2026',
    description:
      'Créez votre application mobile sur-mesure ultra-rapide avec Wastus Spart. Contactez notre équipe dès aujourd’hui.',
    mediaUrl:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    targetUrl: 'https://wa.me/33600000000',
    sponsorTag: 'PARTENAIRE OFFICIEL',
    budgetPlan: 'Campagne VIP Mensuelle',
    status: 'approved',
    submittedBy: 'wasoluachristian@gmail.com',
    submittedAt: Date.now() - 3600000 * 24,
    approvedAt: Date.now() - 3600000 * 12,
    stats: { views: 1250, clicks: 230 },
  }
];

export const subscribeBusinessAds = (callback: (ads: BusinessAd[]) => void) => {
  const colRef = collection(db, 'business_ads');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const ads = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as BusinessAd));
        ads.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        callback(ads);
      } else {
        INITIAL_BUSINESS_ADS.forEach((ad) => {
          setDoc(doc(db, 'business_ads', ad.id), ad).catch(console.error);
        });
        callback(INITIAL_BUSINESS_ADS);
      }
    },
    (err) => {
      console.warn('Firestore business ads error:', err);
      callback(INITIAL_BUSINESS_ADS);
    }
  );
};

export const submitBusinessAdToDb = async (ad: BusinessAd) => {
  const docRef = doc(db, 'business_ads', ad.id);
  await setDoc(docRef, cleanObjectForFirestore(ad));
};

export const updateBusinessAdStatusInDb = async (
  adId: string,
  status: 'approved' | 'rejected' | 'posted_live'
) => {
  const docRef = doc(db, 'business_ads', adId);
  await updateDoc(docRef, {
    status,
    approvedAt: status === 'approved' || status === 'posted_live' ? Date.now() : undefined,
  });
};

export const deleteBusinessAdFromDb = async (adId: string) => {
  const docRef = doc(db, 'business_ads', adId);
  await deleteDoc(docRef);
};

export const postAdToJourneeLive = async (
  ad: BusinessAd,
  adminUser: UserProfile
): Promise<LiveStory> => {
  const storyId = `live_ad_${Date.now()}_${ad.id}`;
  const liveStory: LiveStory = {
    id: storyId,
    userId: adminUser.id,
    userName: `📢 ${ad.companyName}`,
    userAvatar: ad.mediaUrl || adminUser.avatarUrl,
    userTag: '#PARTENAIRE@',
    type: ad.mediaType || 'image',
    mediaUrl: ad.mediaUrl,
    caption: `[PUB OFFICIELLE] ${ad.title} : ${ad.description}`,
    quality: 'hd',
    durationSeconds: 30,
    timestamp: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    isSponsored: true,
    sponsorName: ad.companyName,
    sponsorUrl: ad.targetUrl,
    sponsorBadge: ad.sponsorTag || 'SPONSORISÉ',
  };

  await postLiveStoryToDb(liveStory);

  await updateDoc(doc(db, 'business_ads', ad.id), {
    status: 'posted_live',
    postedToLiveStoryId: storyId,
  }).catch(() => {});

  return liveStory;
};

// ==========================================
// ESPACE LISANGA (GROUPES & COMMUNAUTÉS)
// ==========================================
export const INITIAL_LISANGA_GROUPS: LisangaGroup[] = [
  {
    id: 'lisanga_official_wahou',
    name: 'Lisanga my Wahou Officiel',
    description:
      'Le groupe officiel de la communauté my Wahou. Échanges, suggestions, nouveautés et entraide.',
    imageUrl:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
    category: 'Communauté Officielle',
    isPrivate: false,
    creatorId: 'user_wasolus_admin',
    creatorName: 'Christian Wastus',
    creatorTag: '#Spart20@',
    adminIds: ['user_wasolus_admin'],
    memberIds: ['user_wasolus_admin', 'user_sarah_01', 'user_marcel_02'],
    membersCount: 3,
    rules: 'Respect mutuel, pas de spam ni propos inappropriés. Bienvenue à tous !',
    lastActivity: Date.now() - 1000 * 60 * 15,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    isOfficial: true,
  },
  {
    id: 'lisanga_business_diaspora',
    name: 'Lisanga Business & Entrepreneuriat',
    description:
      'Partage d’opportunités d’affaires, partenariats, investissements et création d’entreprises.',
    imageUrl:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&auto=format&fit=crop&q=80',
    category: 'Business & Affaires',
    isPrivate: false,
    creatorId: 'user_wasolus_admin',
    creatorName: 'Christian Wastus',
    creatorTag: '#Spart20@',
    adminIds: ['user_wasolus_admin'],
    memberIds: ['user_wasolus_admin', 'user_marcel_02'],
    membersCount: 2,
    rules: 'Présentez vos projets avec courtoisie et professionnalisme.',
    lastActivity: Date.now() - 1000 * 60 * 45,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    isOfficial: false,
  },
  {
    id: 'lisanga_musique_culture',
    name: 'Lisanga Musique & Culture',
    description:
      'Espace dédié aux passionnés d’art, de musique, de culture et d’événements live.',
    imageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    category: 'Musique & Culture',
    isPrivate: false,
    creatorId: 'user_sarah_01',
    creatorName: 'Sarah M.',
    creatorTag: '#SarahK@',
    adminIds: ['user_sarah_01'],
    memberIds: ['user_sarah_01', 'user_wasolus_admin'],
    membersCount: 2,
    rules: 'Partagez vos meilleures découvertes artistiques.',
    lastActivity: Date.now() - 1000 * 60 * 120,
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    isOfficial: false,
  },
];

export const subscribeLisangaGroups = (callback: (groups: LisangaGroup[]) => void) => {
  const colRef = collection(db, 'lisanga_groups');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const groups = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as LisangaGroup));
        groups.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
        callback(groups);
      } else {
        INITIAL_LISANGA_GROUPS.forEach((g) => {
          setDoc(doc(db, 'lisanga_groups', g.id), g).catch(console.error);
        });
        callback(INITIAL_LISANGA_GROUPS);
      }
    },
    (err) => {
      console.warn('Firestore lisanga groups error:', err);
      callback(INITIAL_LISANGA_GROUPS);
    }
  );
};

export const createLisangaGroupInDb = async (group: LisangaGroup) => {
  const docRef = doc(db, 'lisanga_groups', group.id);
  await setDoc(docRef, cleanObjectForFirestore(group));
};

export const updateLisangaGroupInDb = async (
  groupId: string,
  updates: Partial<LisangaGroup>
) => {
  const docRef = doc(db, 'lisanga_groups', groupId);
  await updateDoc(docRef, cleanObjectForFirestore(updates));
};

export const joinLisangaGroupInDb = async (groupId: string, userId: string) => {
  const docRef = doc(db, 'lisanga_groups', groupId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as LisangaGroup;
    const currentMembers = data.memberIds || [];
    if (!currentMembers.includes(userId)) {
      const updated = [...currentMembers, userId];
      await updateDoc(
        docRef,
        cleanObjectForFirestore({
          memberIds: updated,
          membersCount: updated.length,
          lastActivity: Date.now(),
        })
      );
    }
  }
};

export const addMembersToLisangaGroupInDb = async (
  groupId: string,
  userIds: string[]
) => {
  const docRef = doc(db, 'lisanga_groups', groupId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as LisangaGroup;
    const currentMembers = data.memberIds || [];
    const updated = Array.from(new Set([...currentMembers, ...userIds]));
    await updateDoc(
      docRef,
      cleanObjectForFirestore({
        memberIds: updated,
        membersCount: updated.length,
        lastActivity: Date.now(),
      })
    );
  }
};

export const leaveLisangaGroupInDb = async (groupId: string, userId: string) => {
  const docRef = doc(db, 'lisanga_groups', groupId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as LisangaGroup;
    const currentMembers = data.memberIds || [];
    const updated = currentMembers.filter((id) => id !== userId);
    await updateDoc(
      docRef,
      cleanObjectForFirestore({
        memberIds: updated,
        membersCount: updated.length,
        lastActivity: Date.now(),
      })
    );
  }
};

export const subscribeLisangaMessages = (
  groupId: string,
  callback: (messages: LisangaMessage[]) => void
) => {
  const colRef = collection(db, 'lisanga_messages');
  const q = query(colRef, where('groupId', '==', groupId));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as LisangaMessage));
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    },
    (err) => {
      console.warn('Firestore lisanga messages error:', err);
      callback([]);
    }
  );
};

export const sendLisangaMessageToDb = async (message: LisangaMessage) => {
  const msgDocRef = doc(db, 'lisanga_messages', message.id);
  await setDoc(msgDocRef, cleanObjectForFirestore(message));

  const groupDocRef = doc(db, 'lisanga_groups', message.groupId);
  await updateDoc(
    groupDocRef,
    cleanObjectForFirestore({
      lastActivity: message.timestamp,
    })
  ).catch(() => {});
};

// ==========================================
// FIRESTORE DATABASE INSPECTION & ADMIN SYNC
// ==========================================

/**
 * Récupère un rapport complet des collections Firestore, documents et statut de connexion
 */
export const fetchFirebaseDatabaseStats = async (): Promise<FirebaseDatabaseStats> => {
  const collectionsConfig = [
    { name: 'users', description: 'Profils et comptes utilisateurs my Wahou', icon: 'Users' },
    { name: 'conversations', description: 'Canaux de discussions privées et métadonnées', icon: 'MessageSquare' },
    { name: 'messages', description: 'Messages texte, vocaux et médias échangés', icon: 'Send' },
    { name: 'lisanga_groups', description: 'Groupes et communautés Lisanga', icon: 'Layers' },
    { name: 'lisanga_messages', description: 'Discussions au sein des groupes Lisanga', icon: 'MessageCircle' },
    { name: 'live_stories', description: 'Stories Journée Live 24H actives', icon: 'Sparkles' },
    { name: 'business_ads', description: 'Campagnes et partenariats publicitaires', icon: 'Briefcase' },
    { name: 'settings', description: 'Configuration globale et synchronisation de la plateforme', icon: 'Sliders' },
  ];

  const summaries: FirebaseCollectionSummary[] = [];
  let totalDocs = 0;
  let isConnected = true;

  for (const col of collectionsConfig) {
    try {
      const snap = await getDocs(collection(db, col.name));
      const count = snap.size;
      totalDocs += count;

      const sampleDocs = snap.docs.slice(0, 10).map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      summaries.push({
        name: col.name,
        count,
        description: col.description,
        icon: col.icon,
        sampleDocs,
      });
    } catch (err) {
      console.warn(`Error querying collection ${col.name}:`, err);
      isConnected = false;
      summaries.push({
        name: col.name,
        count: 0,
        description: col.description,
        icon: col.icon,
        sampleDocs: [],
      });
    }
  }

  return {
    connected: isConnected,
    lastChecked: Date.now(),
    totalCollections: collectionsConfig.length,
    totalDocuments: totalDocs,
    collections: summaries,
  };
};

/**
 * Force la réparation et synchronisation globale de toute la base de données Firestore :
 * 1. Restaure et valide tous les participants sur toutes les conversations existantes
 * 2. Corrige les formats d'unreadCount, lastMessage et timestamps
 * 3. Envoie un signal de synchronisation temps réel global qui force tous les utilisateurs connectés
 *    à réactualiser leurs conversations et messages sans rechargement.
 */
export const forceSynchronizeAndRepairDatabase = async (): Promise<{
  repairedCount: number;
  totalConversations: number;
  syncTimestamp: number;
}> => {
  let repairedCount = 0;
  let totalConversations = 0;
  const syncTimestamp = Date.now();

  try {
    // 1. Inspecter et réparer la collection conversations
    const convosSnap = await getDocs(collection(db, 'conversations'));
    totalConversations = convosSnap.size;

    const batch = writeBatch(db);
    let batchOperations = 0;

    for (const d of convosSnap.docs) {
      const data = d.data() as Conversation;
      let needsUpdate = false;
      const updates: Partial<Conversation> = {};

      // Si les participantIds sont manquants ou corrompus
      let participants = data.participantIds || [];
      if (!Array.isArray(participants) || participants.length === 0) {
        if (d.id.startsWith('direct_')) {
          const parts = d.id.replace('direct_', '').split('_');
          if (parts.length >= 2) {
            participants = parts;
            updates.participantIds = participants;
            needsUpdate = true;
          }
        }
      }

      // Valider unreadCount
      if (!data.unreadCount || typeof data.unreadCount !== 'object') {
        updates.unreadCount = {};
        participants.forEach((pid) => {
          updates.unreadCount![pid] = 0;
        });
        needsUpdate = true;
      }

      // Valider timestamps
      if (!data.updatedAt) {
        updates.updatedAt = data.createdAt || syncTimestamp;
        needsUpdate = true;
      }

      // Valider lastMessage
      if (!data.lastMessage) {
        updates.lastMessage = {
          text: 'Conversation active sur my Wahou',
          senderName: 'my Wahou',
          timestamp: data.updatedAt || syncTimestamp,
          type: 'text',
          isRead: true,
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        batch.update(doc(db, 'conversations', d.id), cleanObjectForFirestore(updates));
        batchOperations++;
        repairedCount++;
      }
    }

    if (batchOperations > 0) {
      await batch.commit();
    }

    // 2. Émettre le signal de synchronisation global dans settings/global_config
    const settingsRef = doc(db, 'settings', 'global_config');
    await setDoc(
      settingsRef,
      cleanObjectForFirestore({
        syncTimestamp,
        updatedAt: syncTimestamp,
      }),
      { merge: true }
    );

    // 3. Traiter également la file d'attente hors-ligne si connectée
    await processOfflineMessageQueue();

    return {
      repairedCount,
      totalConversations,
      syncTimestamp,
    };
  } catch (err) {
    console.error('Error during forceSynchronizeAndRepairDatabase:', err);
    throw err;
  }
};

/**
 * Supprime un document spécifique d'une collection (Outil Admin)
 */
export const deleteDocumentFromCollection = async (
  collectionName: string,
  docId: string
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
};

