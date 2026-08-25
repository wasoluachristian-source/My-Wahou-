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
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ChatMessage, Conversation, AppSettings, LiveStory, BusinessAd, LisangaGroup, LisangaMessage } from '../types';

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
  primaryColor: '#7C3AED', // Vivid Electric Indigo/Violet
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
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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

// App Settings Listeners and Operations
export const subscribeAppSettings = (callback: (settings: AppSettings) => void) => {
  const docRef = doc(db, 'settings', 'global_config');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as AppSettings);
    } else {
      // Initialize with defaults if doesn't exist
      setDoc(docRef, cleanObjectForFirestore(DEFAULT_APP_SETTINGS)).catch(console.error);
      callback(DEFAULT_APP_SETTINGS);
    }
  }, (error) => {
    console.warn('Using local settings due to firestore error:', error);
    callback(DEFAULT_APP_SETTINGS);
  });
};

// Users
export const subscribeAllUsers = (callback: (users: UserProfile[]) => void) => {
  const colRef = collection(db, 'users');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const allDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
      
      // Filter out and clean up legacy fake/mock accounts
      const validUsers: UserProfile[] = [];
      for (const u of allDocs) {
        const emailLower = (u.email || '').toLowerCase().trim();
        if (
          FAKE_ACCOUNT_IDS.includes(u.id) ||
          FAKE_ACCOUNT_EMAILS.includes(emailLower) ||
          emailLower.includes('@wahou.app') ||
          emailLower === 'spart@gmail.com'
        ) {
          // Asynchronously purge fake account from Firestore
          deleteDoc(doc(db, 'users', u.id)).catch(() => {});
        } else {
          // Ensure profileTag exists and is properly formatted
          let profileTag = u.profileTag ? normalizeProfileTag(u.profileTag) : '';

          // Enforce strict role: ONLY wasoluachristian@gmail.com can have admin role
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
              role: 'user' // Any other account is strictly a standard user
            });
          }
        }
      }

      // If no valid admin user is present yet, seed the admin
      const hasAdmin = validUsers.some(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (!hasAdmin) {
        setDoc(doc(db, 'users', INITIAL_USERS[0].id), INITIAL_USERS[0]).catch(console.error);
        validUsers.unshift(INITIAL_USERS[0]);
      }

      callback(validUsers);
    } else {
      // Seed only the real admin user into firestore
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

  // Guarantee strict security on save: ONLY wasoluachristian@gmail.com gets admin privileges
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

export const updateAppSettingsInDb = async (newSettings: Partial<AppSettings>) => {
  const docRef = doc(db, 'settings', 'global_config');
  await setDoc(docRef, cleanObjectForFirestore({ ...newSettings, updatedAt: Date.now() }), { merge: true });
};

export const deleteUserFromDb = async (userId: string) => {
  const docRef = doc(db, 'users', userId);
  await deleteDoc(docRef);
};

// Conversations
export const subscribeUserConversations = (userId: string, callback: (conversations: Conversation[]) => void) => {
  const colRef = collection(db, 'conversations');
  const q = query(colRef, where('participantIds', 'array-contains', userId));
  
  return onSnapshot(q, (snapshot) => {
    const convos = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Conversation));
    convos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(convos);
  }, (error) => {
    console.warn('Firestore convos error:', error);
    callback([]);
  });
};

export const createOrGetDirectConversation = async (currentUserId: string, targetUser: UserProfile): Promise<string> => {
  const sortedIds = [currentUserId, targetUser.id].sort();
  const convoId = `direct_${sortedIds.join('_')}`;
  const docRef = doc(db, 'conversations', convoId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    const newConvo: Conversation = {
      id: convoId,
      isGroup: false,
      participantIds: [currentUserId, targetUser.id],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastMessage: {
        text: '👋 Nouvelle conversation lancée sur my Wahou',
        senderName: 'my Wahou',
        timestamp: Date.now(),
        type: 'text'
      }
    };
    await setDoc(docRef, newConvo);
  }
  return convoId;
};

// Messages
export const subscribeMessages = (conversationId: string, callback: (messages: ChatMessage[]) => void) => {
  const colRef = collection(db, 'messages');
  const q = query(colRef, where('conversationId', '==', conversationId));

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ChatMessage));
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    callback(msgs);
  }, (error) => {
    console.warn('Firestore messages error:', error);
    callback([]);
  });
};

export const sendMessageToDb = async (message: ChatMessage) => {
  // Save message
  const msgDocRef = doc(db, 'messages', message.id);
  await setDoc(msgDocRef, cleanObjectForFirestore(message));

  // Update conversation lastMessage & updatedAt
  const convoDocRef = doc(db, 'conversations', message.conversationId);
  let lastText = message.content;
  if (message.type === 'voice') lastText = `🎤 Note vocale (${Math.round(message.audioDuration || 0)}s)`;
  if (message.type === 'image') lastText = '🖼️ Photo';
  if (message.type === 'video') lastText = '🎬 Vidéo';
  if (message.type === 'call_log') lastText = `📞 ${message.content}`;

  await updateDoc(convoDocRef, cleanObjectForFirestore({
    updatedAt: message.timestamp,
    lastMessage: {
      text: lastText,
      senderName: message.senderName,
      timestamp: message.timestamp,
      type: message.type
    }
  })).catch(() => {
    // If convo document not exist yet, create it
    setDoc(convoDocRef, cleanObjectForFirestore({
      id: message.conversationId,
      participantIds: [message.senderId],
      isGroup: false,
      updatedAt: message.timestamp,
      createdAt: message.timestamp,
      lastMessage: {
        text: lastText,
        senderName: message.senderName,
        timestamp: message.timestamp,
        type: message.type
      }
    }));
  });
};

export const reactToMessageInDb = async (messageId: string, reaction: { userId: string; emoji: string }) => {
  const docRef = doc(db, 'messages', messageId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as ChatMessage;
    const currentReactions = data.reactions || [];
    const filtered = currentReactions.filter(r => r.userId !== reaction.userId);
    filtered.push(reaction);
    await updateDoc(docRef, cleanObjectForFirestore({ reactions: filtered }));
  }
};

// ==========================================
// JOURNÉE LIVE (STORIES 24H)
// ==========================================
export const subscribeLiveStories = (callback: (stories: LiveStory[]) => void) => {
  const colRef = collection(db, 'stories');
  return onSnapshot(colRef, (snapshot) => {
    const now = Date.now();
    const allStories = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as LiveStory))
      .filter(s => (s.expiresAt || 0) > now); // Only active stories within 24h

    allStories.sort((a, b) => b.timestamp - a.timestamp);
    callback(allStories);
  }, (err) => {
    console.warn('Firestore stories error:', err);
    callback([]);
  });
};

export const postLiveStoryToDb = async (story: LiveStory) => {
  const docRef = doc(db, 'stories', story.id);
  await setDoc(docRef, cleanObjectForFirestore(story));
};

export const deleteLiveStoryFromDb = async (storyId: string) => {
  const docRef = doc(db, 'stories', storyId);
  await deleteDoc(docRef);
};

export const reactToLiveStoryInDb = async (storyId: string, reaction: { userId: string; emoji: string }) => {
  const docRef = doc(db, 'stories', storyId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as LiveStory;
    const currentReactions = data.reactions || [];
    const filtered = currentReactions.filter(r => r.userId !== reaction.userId);
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
    description: 'Bénéficiez de 20% de réduction sur votre première commande avec le code WAHOU20 ! Service disponible 7j/7.',
    mediaUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    targetUrl: 'https://wa.me/243812345678',
    sponsorTag: 'OFFRE PARTENAIRE',
    budgetPlan: '24h Live Sponsorisé',
    status: 'approved',
    submittedBy: 'user_kin_business',
    submittedAt: Date.now() - 3600000 * 5,
    approvedAt: Date.now() - 3600000 * 2,
    stats: { views: 420, clicks: 58 }
  },
  {
    id: 'ad_wahou_tech',
    companyName: 'Wastus Spart Studios',
    contactEmail: 'wasoluachristian@gmail.com',
    contactPhone: '+33 6 00 00 00 00',
    category: 'Technologie & Mobile',
    title: 'Développement Web & Applications 2026',
    description: 'Créez votre application mobile sur-mesure ultra-rapide avec Wastus Spart. Contactez notre équipe dès aujourd’hui.',
    mediaUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    targetUrl: 'https://wa.me/33600000000',
    sponsorTag: 'PARTENAIRE OFFICIEL',
    budgetPlan: 'Campagne VIP Mensuelle',
    status: 'approved',
    submittedBy: 'wasoluachristian@gmail.com',
    submittedAt: Date.now() - 3600000 * 24,
    approvedAt: Date.now() - 3600000 * 12,
    stats: { views: 1250, clicks: 230 }
  }
];

export const subscribeBusinessAds = (callback: (ads: BusinessAd[]) => void) => {
  const colRef = collection(db, 'business_ads');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const ads = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as BusinessAd));
      ads.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      callback(ads);
    } else {
      // Seed initial ads in database if empty
      INITIAL_BUSINESS_ADS.forEach(ad => {
        setDoc(doc(db, 'business_ads', ad.id), ad).catch(console.error);
      });
      callback(INITIAL_BUSINESS_ADS);
    }
  }, (err) => {
    console.warn('Firestore business ads error:', err);
    callback(INITIAL_BUSINESS_ADS);
  });
};

export const submitBusinessAdToDb = async (ad: BusinessAd) => {
  const docRef = doc(db, 'business_ads', ad.id);
  await setDoc(docRef, ad);
};

export const updateBusinessAdStatusInDb = async (adId: string, status: 'approved' | 'rejected' | 'posted_live') => {
  const docRef = doc(db, 'business_ads', adId);
  await updateDoc(docRef, {
    status,
    approvedAt: status === 'approved' || status === 'posted_live' ? Date.now() : undefined
  });
};

export const deleteBusinessAdFromDb = async (adId: string) => {
  const docRef = doc(db, 'business_ads', adId);
  await deleteDoc(docRef);
};

/**
 * Permet à l'administrateur de diffuser une publicité entreprise directement sur Journée Live
 */
export const postAdToJourneeLive = async (ad: BusinessAd, adminUser: UserProfile): Promise<LiveStory> => {
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
    sponsorBadge: ad.sponsorTag || 'SPONSORISÉ'
  };

  // 1. Post to stories
  await postLiveStoryToDb(liveStory);

  // 2. Mark ad as posted_live
  await updateDoc(doc(db, 'business_ads', ad.id), {
    status: 'posted_live',
    postedToLiveStoryId: storyId
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
    description: 'Le groupe officiel de la communauté my Wahou. Échanges, suggestions, nouveautés et entraide.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
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
    isOfficial: true
  },
  {
    id: 'lisanga_business_diaspora',
    name: 'Lisanga Business & Entrepreneuriat',
    description: 'Partage d’opportunités d’affaires, partenariats, investissements et création d’entreprises.',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&auto=format&fit=crop&q=80',
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
    isOfficial: false
  },
  {
    id: 'lisanga_musique_culture',
    name: 'Lisanga Musique & Culture',
    description: 'Espace dédié aux passionnés d’art, de musique, de culture et d’événements live.',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
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
    isOfficial: false
  }
];

export const subscribeLisangaGroups = (callback: (groups: LisangaGroup[]) => void) => {
  const colRef = collection(db, 'lisanga_groups');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const groups = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as LisangaGroup));
      groups.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
      callback(groups);
    } else {
      // Seed initial lisanga groups
      INITIAL_LISANGA_GROUPS.forEach(g => {
        setDoc(doc(db, 'lisanga_groups', g.id), g).catch(console.error);
      });
      callback(INITIAL_LISANGA_GROUPS);
    }
  }, (err) => {
    console.warn('Firestore lisanga groups error:', err);
    callback(INITIAL_LISANGA_GROUPS);
  });
};

export const createLisangaGroupInDb = async (group: LisangaGroup) => {
  const docRef = doc(db, 'lisanga_groups', group.id);
  await setDoc(docRef, cleanObjectForFirestore(group));
};

export const updateLisangaGroupInDb = async (groupId: string, updates: Partial<LisangaGroup>) => {
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
      await updateDoc(docRef, cleanObjectForFirestore({
        memberIds: updated,
        membersCount: updated.length,
        lastActivity: Date.now()
      }));
    }
  }
};

export const addMembersToLisangaGroupInDb = async (groupId: string, userIds: string[]) => {
  const docRef = doc(db, 'lisanga_groups', groupId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as LisangaGroup;
    const currentMembers = data.memberIds || [];
    const updated = Array.from(new Set([...currentMembers, ...userIds]));
    await updateDoc(docRef, cleanObjectForFirestore({
      memberIds: updated,
      membersCount: updated.length,
      lastActivity: Date.now()
    }));
  }
};

export const leaveLisangaGroupInDb = async (groupId: string, userId: string) => {
  const docRef = doc(db, 'lisanga_groups', groupId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as LisangaGroup;
    const currentMembers = data.memberIds || [];
    const updated = currentMembers.filter(id => id !== userId);
    await updateDoc(docRef, cleanObjectForFirestore({
      memberIds: updated,
      membersCount: updated.length,
      lastActivity: Date.now()
    }));
  }
};

export const subscribeLisangaMessages = (groupId: string, callback: (messages: LisangaMessage[]) => void) => {
  const colRef = collection(db, 'lisanga_messages');
  const q = query(colRef, where('groupId', '==', groupId));

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as LisangaMessage));
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    callback(msgs);
  }, (err) => {
    console.warn('Firestore lisanga messages error:', err);
    callback([]);
  });
};

export const sendLisangaMessageToDb = async (message: LisangaMessage) => {
  const msgDocRef = doc(db, 'lisanga_messages', message.id);
  await setDoc(msgDocRef, cleanObjectForFirestore(message));

  // Update group last activity
  const groupDocRef = doc(db, 'lisanga_groups', message.groupId);
  await updateDoc(groupDocRef, cleanObjectForFirestore({
    lastActivity: message.timestamp
  })).catch(() => {});
};
