import { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  Sparkles,
  Plus,
  Image as ImageIcon,
  Video,
  Play,
  Pause,
  X,
  Heart,
  Flame,
  ThumbsUp,
  Smile,
  Trash2,
  Clock,
  Eye,
  Crown,
  CheckCircle,
  AlertCircle,
  Upload,
  Radio,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Type as TypeIcon,
  Palette,
  Lock,
  Users
} from 'lucide-react';
import { UserProfile, LiveStory, StoryQuality, Conversation } from '../types';
import {
  subscribeLiveStories,
  postLiveStoryToDb,
  deleteLiveStoryFromDb,
  reactToLiveStoryInDb
} from '../services/dbService';
import { compressImageFile, getVideoDuration, readFileAsBase64 } from '../utils/mediaUtils';

interface JourneeLiveViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  conversations?: Conversation[];
  onOpenForfaitModal: () => void;
  onSelectUserForChat?: (user: UserProfile) => void;
}

const GRADIENT_PRESETS = [
  { id: 'sunset', label: 'Crépuscule Rose', class: 'from-pink-600 via-rose-700 to-amber-600' },
  { id: 'royal', label: 'Violet Royal', class: 'from-purple-900 via-indigo-950 to-blue-900' },
  { id: 'emerald', label: 'Émeraude Nuit', class: 'from-emerald-800 via-teal-900 to-cyan-950' },
  { id: 'fire', label: 'Flamme Intense', class: 'from-amber-600 via-orange-700 to-red-800' },
  { id: 'neon', label: 'Cyber Fushia', class: 'from-fuchsia-800 via-purple-900 to-pink-900' },
  { id: 'midnight', label: 'Noir Luxe', class: 'from-slate-900 via-zinc-900 to-black' },
  { id: 'ocean', label: 'Océan Profond', class: 'from-cyan-700 via-blue-900 to-indigo-950' },
  { id: 'velvet', label: 'Velours Rubis', class: 'from-rose-900 via-pink-950 to-purple-950' }
];

export function JourneeLiveView({
  currentUser,
  allUsers,
  conversations = [],
  onOpenForfaitModal,
  onSelectUserForChat,
}: JourneeLiveViewProps) {
  const [stories, setStories] = useState<LiveStory[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storyMode, setStoryMode] = useState<'text' | 'image' | 'video'>('text');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  
  // Text Story states
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].class);
  const [fontStyle, setFontStyle] = useState<'bold' | 'serif' | 'mono' | 'handwriting'>('bold');

  const [quality, setQuality] = useState<StoryQuality>('standard');
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [storyProgress, setStoryProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Subscribe to all live stories (24h)
  useEffect(() => {
    const unsub = subscribeLiveStories((live) => {
      setStories(live);
    });
    return () => unsub();
  }, []);

  // Compute User's Contact IDs: all users that the current user has a direct conversation with
  const contactUserIds = new Set<string>();
  conversations.forEach((c) => {
    if (c.participantIds && Array.isArray(c.participantIds)) {
      c.participantIds.forEach((pid) => {
        if (pid !== currentUser.id) {
          contactUserIds.add(pid);
        }
      });
    }
  });

  // Filter visible stories based on strict privacy:
  // Visible if: 1) It's mine, 2) It's from a contact, 3) It's an official sponsored ad
  const visibleStories = stories.filter((s) => {
    if (s.userId === currentUser.id) return true;
    if (s.isSponsored) return true;
    return contactUserIds.has(s.userId);
  });

  const myStories = visibleStories.filter((s) => s.userId === currentUser.id);
  const otherStories = visibleStories.filter((s) => s.userId !== currentUser.id);

  const myPhotosCount = myStories.filter((s) => s.type === 'image').length;
  const myVideosCount = myStories.filter((s) => s.type === 'video').length;

  // Limits: 3 photos free, 2 videos free (Text stories are 100% free and unlimited)
  const MAX_FREE_PHOTOS = 3;
  const MAX_FREE_VIDEOS = 2;

  const canPostPhoto = currentUser.isVIP || myPhotosCount < MAX_FREE_PHOTOS;
  const canPostVideo = currentUser.isVIP || myVideosCount < MAX_FREE_VIDEOS;

  // Story progress timer for viewing
  useEffect(() => {
    if (activeStoryIndex === null || !isPlaying) return;
    const currentStory = visibleStories[activeStoryIndex];
    if (!currentStory) return;

    const duration = (currentStory.durationSeconds || (currentStory.type === 'video' ? 15 : currentStory.type === 'text' ? 8 : 6)) * 1000;
    const intervalTime = 100;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Go to next story or close
          if (activeStoryIndex < visibleStories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeStoryIndex, isPlaying, visibleStories]);

  // Handle media file upload
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    const isVideoFile = file.type.startsWith('video/');
    const isImageFile = file.type.startsWith('image/');

    if (!isVideoFile && !isImageFile) {
      setErrorMsg('Format non supporté. Choisissez une photo (JPG, PNG) ou une vidéo (MP4, WebM).');
      return;
    }

    if (isVideoFile) {
      if (!canPostVideo) {
        setErrorMsg(`Limite atteinte : Vous avez déjà posté ${myVideosCount}/${MAX_FREE_VIDEOS} vidéos gratuites aujourd'hui.`);
        return;
      }

      const duration = await getVideoDuration(file);
      if (duration > 31) {
        setErrorMsg(`La vidéo dépasse 30 secondes (${Math.round(duration)}s). Veuillez choisir un extrait de 30 secondes max.`);
        return;
      }

      setStoryMode('video');
      const base64 = await readFileAsBase64(file);
      setMediaPreview(base64);
    } else {
      if (!canPostPhoto) {
        setErrorMsg(`Limite atteinte : Vous avez déjà posté ${myPhotosCount}/${MAX_FREE_PHOTOS} photos gratuites aujourd'hui.`);
        return;
      }

      setStoryMode('image');
      const maxDim = quality === 'hd' ? 1200 : quality === 'eco' ? 600 : 900;
      const qValue = quality === 'hd' ? 0.88 : quality === 'eco' ? 0.65 : 0.8;
      const compressed = await compressImageFile(file, maxDim, maxDim, qValue);
      setMediaPreview(compressed);
    }
  };

  // Publish Story
  const handlePublishStory = async () => {
    if (storyMode === 'text' && !textContent.trim()) {
      setErrorMsg('Veuillez saisir votre texte avant de publier.');
      return;
    }
    if ((storyMode === 'image' || storyMode === 'video') && !mediaPreview) {
      setErrorMsg('Veuillez sélectionner une image ou vidéo.');
      return;
    }

    setIsPublishing(true);
    try {
      const newStory: LiveStory = {
        id: `story_${Date.now()}_${currentUser.id}`,
        userId: currentUser.id,
        userName: currentUser.displayName,
        userAvatar: currentUser.avatarUrl,
        userTag: currentUser.profileTag,
        type: storyMode,
        mediaUrl: storyMode !== 'text' ? mediaPreview || undefined : undefined,
        textContent: storyMode === 'text' ? textContent.trim() : undefined,
        textGradient: storyMode === 'text' ? selectedGradient : undefined,
        fontStyle: storyMode === 'text' ? fontStyle : undefined,
        caption: caption.trim() || undefined,
        quality: quality,
        durationSeconds: storyMode === 'video' ? 30 : storyMode === 'text' ? 8 : 6,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
        viewsCount: 1,
        reactions: [],
      };

      await postLiveStoryToDb(newStory);
      setIsCreatingStory(false);
      setMediaPreview(null);
      setTextContent('');
      setCaption('');
    } catch (err) {
      console.error('Error posting story:', err);
      setErrorMsg('Erreur lors de la publication. Veuillez réessayer.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (confirm('Voulez-vous supprimer cette story de votre Journée Live ?')) {
      await deleteLiveStoryFromDb(storyId);
      if (activeStoryIndex !== null) {
        setActiveStoryIndex(null);
      }
    }
  };

  const handleReactStory = async (storyId: string, emoji: string) => {
    await reactToLiveStoryInDb(storyId, { userId: currentUser.id, emoji });
  };

  const currentViewedStory = activeStoryIndex !== null ? visibleStories[activeStoryIndex] : null;

  const getFontFamilyClass = (style?: string) => {
    switch (style) {
      case 'serif':
        return 'font-serif italic tracking-wide';
      case 'mono':
        return 'font-mono font-bold tracking-tight';
      case 'handwriting':
        return 'italic font-light tracking-wide';
      case 'bold':
      default:
        return 'font-black tracking-tight uppercase';
    }
  };

  return (
    <div id="journee-live-container" className="flex-1 h-full bg-zinc-950 flex flex-col overflow-y-auto select-none">
      {/* Top Space Header */}
      <div className="p-4 sm:p-6 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-pink-600/30">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">Journée Live</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                24H LIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Partagez vos textes, pensées, photos & vidéos 30s éphémères
            </p>
          </div>
        </div>

        {/* Action Button & Stats */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">Visibilité :</span>
            <span className="font-bold text-emerald-300">Contacts uniquement</span>
          </div>

          <button
            id="create-live-story-btn"
            onClick={() => {
              setErrorMsg('');
              setIsCreatingStory(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-pink-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter ma Journée Live</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <div className="p-3 rounded-2xl bg-gradient-to-r from-zinc-900/90 to-violet-950/30 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Confidentialité garantie :</strong> Vos stories live sont vues <strong>uniquement par vos contacts</strong> avec qui vous échangez.
            </span>
          </div>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            24h / 24 Sécurisé
          </span>
        </div>
      </div>

      {/* Main Stories Grid View */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Section 1: Mon Statut Live */}
        <div>
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            Ma Journée Live (24h)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Create Card */}
            <div
              id="add-story-card"
              onClick={() => {
                setErrorMsg('');
                setIsCreatingStory(true);
              }}
              className="aspect-[9/16] rounded-3xl border-2 border-dashed border-zinc-700 hover:border-pink-500 bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer flex flex-col items-center justify-center text-center p-4 transition group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-pink-600/30 group-hover:scale-110 transition">
                <Plus className="w-6 h-6" />
              </div>
              <span className="mt-3 font-bold text-xs text-white">Poster en Live</span>
              <span className="text-[10px] text-zinc-400 mt-1">Texte, Photo ou Vidéo</span>
            </div>

            {/* My Active Stories */}
            {myStories.map((story) => {
              const globalIndex = visibleStories.findIndex((s) => s.id === story.id);
              const timeLeftHours = Math.max(1, Math.round((story.expiresAt - Date.now()) / (1000 * 60 * 60)));

              return (
                <div
                  key={story.id}
                  onClick={() => {
                    setActiveStoryIndex(globalIndex);
                    setStoryProgress(0);
                  }}
                  className="aspect-[9/16] rounded-3xl overflow-hidden relative cursor-pointer group border-2 border-pink-500 shadow-lg shadow-pink-500/20"
                >
                  {story.type === 'video' ? (
                    <video src={story.mediaUrl} className="w-full h-full object-cover" />
                  ) : story.type === 'text' ? (
                    <div className={`w-full h-full bg-gradient-to-br ${story.textGradient || 'from-violet-800 to-pink-800'} p-4 flex items-center justify-center text-center`}>
                      <p className={`text-xs text-white line-clamp-6 drop-shadow-md ${getFontFamilyClass(story.fontStyle)}`}>
                        {story.textContent}
                      </p>
                    </div>
                  ) : (
                    <img src={story.mediaUrl} alt="Story" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-between pointer-events-none">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-pink-600 text-white font-black text-[9px] uppercase tracking-wider">
                        Moi
                      </span>
                      <span className="text-[10px] font-mono text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {timeLeftHours}h
                      </span>
                    </div>

                    <div>
                      {story.caption && (
                        <p className="text-xs text-white line-clamp-2 font-medium mb-1 drop-shadow">
                          {story.caption}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-pink-300 font-bold">
                        <span>{story.quality.toUpperCase()}</span>
                        <span>{story.type === 'video' ? '🎬 30s' : story.type === 'text' ? '✍️ Texte' : '🖼️ Photo'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Journée Live de mes Contacts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-violet-400" />
              Stories de mes Contacts ({otherStories.length})
            </h3>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {contactUserIds.size} contacts actifs
            </span>
          </div>

          {otherStories.length === 0 ? (
            <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center text-zinc-400">
              <Sparkles className="w-10 h-10 text-pink-400/50 mx-auto mb-2" />
              <h4 className="font-bold text-white text-sm mb-1">Aucune story de contact pour le moment</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Vos contacts n'ont pas encore publié aujourd'hui. Dès qu'un de vos contacts publie un texte, une photo ou une vidéo, il apparaîtra ici !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {otherStories.map((story) => {
                const globalIndex = visibleStories.findIndex((s) => s.id === story.id);
                const timeLeftHours = Math.max(1, Math.round((story.expiresAt - Date.now()) / (1000 * 60 * 60)));

                return (
                  <div
                    key={story.id}
                    onClick={() => {
                      setActiveStoryIndex(globalIndex);
                      setStoryProgress(0);
                    }}
                    className="aspect-[9/16] rounded-3xl overflow-hidden relative cursor-pointer group border border-zinc-800 hover:border-violet-500 transition shadow-md"
                  >
                    {story.type === 'video' ? (
                      <video src={story.mediaUrl} className="w-full h-full object-cover" />
                    ) : story.type === 'text' ? (
                      <div className={`w-full h-full bg-gradient-to-br ${story.textGradient || 'from-violet-800 to-pink-800'} p-4 flex items-center justify-center text-center`}>
                        <p className={`text-xs text-white line-clamp-6 drop-shadow-md ${getFontFamilyClass(story.fontStyle)}`}>
                          {story.textContent}
                        </p>
                      </div>
                    ) : (
                      <img src={story.mediaUrl} alt={story.userName} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-between pointer-events-none">
                      <div className="flex items-center gap-2">
                        <img
                          src={story.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt={story.userName}
                          className={`w-7 h-7 rounded-full object-cover border-2 ${story.isSponsored ? 'border-pink-500 animate-pulse' : 'border-violet-500'}`}
                        />
                        <div className="truncate">
                          <span className="text-[11px] font-bold text-white block truncate leading-tight">
                            {story.isSponsored ? (story.sponsorName || story.userName) : story.userName}
                          </span>
                          <span className="text-[9px] font-mono text-violet-300 block truncate">
                            {story.isSponsored ? (story.sponsorBadge || '⭐ Sponsorisé') : (story.userTag || '#Profil@')}
                          </span>
                        </div>
                      </div>

                      <div>
                        {story.isSponsored && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[9px] font-black uppercase mb-1 shadow">
                            Publicité Live
                          </span>
                        )}
                        {story.type === 'text' && !story.isSponsored && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-violet-600/60 text-white text-[8px] font-bold uppercase mb-1">
                            ✍️ Story Texte
                          </span>
                        )}
                        {story.caption && (
                          <p className="text-xs text-white line-clamp-2 font-medium mb-1 drop-shadow">
                            {story.caption}
                          </p>
                        )}
                        <span className="text-[9px] font-mono text-zinc-400 bg-black/60 px-1.5 py-0.5 rounded">
                          Expire dans {timeLeftHours}h
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL: PUBLISH NEW LIVE STORY */}
      {/* ==================================================== */}
      {isCreatingStory && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-pink-600/20 text-pink-400">
                  <Radio className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Publier dans Journée Live</h3>
                  <p className="text-xs text-zinc-400">Visible pendant 24 heures par vos contacts</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreatingStory(false);
                  setMediaPreview(null);
                  setTextContent('');
                }}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="my-3 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Mode Tabs: Texte / Photo / Vidéo */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <button
                type="button"
                onClick={() => {
                  setStoryMode('text');
                  setErrorMsg('');
                }}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  storyMode === 'text'
                    ? 'border-pink-500 bg-pink-950/40 text-pink-300 shadow-md shadow-pink-500/10'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <TypeIcon className="w-4 h-4 text-pink-400" />
                <span>✍️ Texte</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStoryMode('image');
                  setErrorMsg('');
                }}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  storyMode === 'image'
                    ? 'border-pink-500 bg-pink-950/40 text-pink-300 shadow-md shadow-pink-500/10'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-rose-400" />
                <span>🖼️ Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStoryMode('video');
                  setErrorMsg('');
                }}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  storyMode === 'video'
                    ? 'border-pink-500 bg-pink-950/40 text-pink-300 shadow-md shadow-pink-500/10'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 text-amber-400" />
                <span>🎬 Vidéo (30s)</span>
              </button>
            </div>

            {/* TAB 1: TEXT STORY CREATION */}
            {storyMode === 'text' && (
              <div className="space-y-4">
                {/* Live Story Canvas Preview */}
                <div className={`w-full aspect-[16/9] sm:aspect-[2/1] rounded-2xl bg-gradient-to-br ${selectedGradient} p-6 flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden transition-all duration-300`}>
                  <div className="w-full flex items-center justify-between text-white/80 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                        alt={currentUser.displayName}
                        className="w-5 h-5 rounded-full object-cover border border-white/50"
                      />
                      <span className="font-bold">{currentUser.displayName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-black/40 font-mono">Aperçu Live</span>
                  </div>

                  <p className={`text-base sm:text-lg text-white drop-shadow-md max-w-sm px-2 ${getFontFamilyClass(fontStyle)}`}>
                    {textContent.trim() || 'Écrivez votre texte ici...'}
                  </p>

                  <div className="text-[10px] text-white/60 font-mono">
                    Visible 24h par vos contacts
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">
                    Votre texte / pensée
                  </label>
                  <textarea
                    rows={3}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Écrivez ce que vous avez sur le cœur, une citation, un événement..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-pink-500 focus:outline-none resize-none"
                    maxLength={300}
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                    <span>Partage illimité et 100% gratuit</span>
                    <span>{textContent.length}/300</span>
                  </div>
                </div>

                {/* Gradient Picker */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-pink-400" />
                    <span>Fond Dégradé</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedGradient(preset.class)}
                        className={`h-10 rounded-xl bg-gradient-to-br ${preset.class} transition border-2 flex items-center justify-center ${
                          selectedGradient === preset.class ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        title={preset.label}
                      >
                        {selectedGradient === preset.class && (
                          <CheckCircle className="w-4 h-4 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Style Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase">
                    Style de police
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'bold', label: 'Moderne Gras' },
                      { id: 'serif', label: 'Élégant Serif' },
                      { id: 'mono', label: 'Monospace' },
                      { id: 'handwriting', label: 'Poétique' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontStyle(f.id as any)}
                        className={`p-2 rounded-xl border text-xs font-medium transition text-center ${
                          fontStyle === f.id
                            ? 'border-pink-500 bg-pink-950/40 text-pink-300'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2 & 3: PHOTO / VIDEO UPLOAD */}
            {(storyMode === 'image' || storyMode === 'video') && (
              <div className="space-y-4">
                {!mediaPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[16/9] rounded-2xl border-2 border-dashed border-zinc-700 hover:border-pink-500 bg-zinc-900/60 cursor-pointer flex flex-col items-center justify-center p-6 text-center transition group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-pink-600/20 text-pink-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-sm text-white mb-1">
                      {storyMode === 'video' ? 'Choisir une vidéo (30s max)' : 'Choisir une photo'}
                    </h4>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      Depuis la galerie de votre téléphone ou les fichiers de votre ordinateur.
                    </p>
                  </div>
                ) : (
                  <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-zinc-700 bg-black">
                    {storyMode === 'video' ? (
                      <video src={mediaPreview} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                    )}
                    <button
                      onClick={() => setMediaPreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={storyMode === 'video' ? 'video/*' : 'image/*'}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Quality Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-pink-400" />
                    <span>Qualité de diffusion</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuality('eco')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center ${
                        quality === 'eco'
                          ? 'border-pink-500 bg-pink-950/40 text-pink-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Économiseur</span>
                      <span className="text-[10px] font-normal opacity-70">Faible débit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuality('standard')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center ${
                        quality === 'standard'
                          ? 'border-pink-500 bg-pink-950/40 text-pink-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Standard</span>
                      <span className="text-[10px] font-normal opacity-70">Recommandé</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuality('hd')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center ${
                        quality === 'hd'
                          ? 'border-pink-500 bg-pink-950/40 text-pink-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Haute Définition</span>
                      <span className="text-[10px] font-normal opacity-70">Maxi netteté HD</span>
                    </button>
                  </div>
                </div>

                {/* Caption Input */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">
                    Légende / Message (optionnel)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ex: Belle journée avec l'équipe ! ☀️"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex items-center justify-between pt-4 mt-5 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingStory(false);
                  setMediaPreview(null);
                  setTextContent('');
                }}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Annuler
              </button>

              <button
                type="button"
                id="submit-story-btn"
                disabled={
                  isPublishing ||
                  (storyMode === 'text' && !textContent.trim()) ||
                  (storyMode !== 'text' && !mediaPreview)
                }
                onClick={handlePublishStory}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-pink-600/30 transition disabled:opacity-50"
              >
                <Radio className="w-4 h-4" />
                <span>{isPublishing ? 'Publication en direct...' : 'Diffuser à mes contacts'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STORY VIEWER FULLSCREEN PLAYER */}
      {/* ==================================================== */}
      {currentViewedStory && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="relative w-full max-w-sm aspect-[9/16] max-h-[92vh] bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col justify-between">
            {/* Top Multi-Story Progress Bars */}
            <div className="absolute top-0 inset-x-0 p-3 z-30 flex items-center gap-1.5 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                  style={{ width: `${storyProgress}%` }}
                />
              </div>
            </div>

            {/* Author Header */}
            <div className="absolute top-5 inset-x-0 p-3 z-30 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <img
                  src={currentViewedStory.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                  alt={currentViewedStory.userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                />
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1">
                    <span>{currentViewedStory.userName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-600 font-bold">
                      {currentViewedStory.quality.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-pink-300">
                    {currentViewedStory.userTag || '#Profil@'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentViewedStory.userId === currentUser.id && (
                  <button
                    onClick={() => handleDeleteStory(currentViewedStory.id)}
                    className="p-1.5 rounded-full bg-black/50 text-red-400 hover:bg-red-600 hover:text-white transition"
                    title="Supprimer ma story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-full bg-black/50 text-white hover:bg-white/20 transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setActiveStoryIndex(null)}
                  className="p-1.5 rounded-full bg-black/50 text-white hover:bg-white/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Center Story Content (Video / Image / Text) */}
            <div className="w-full h-full flex items-center justify-center bg-black relative">
              {currentViewedStory.type === 'video' ? (
                <video
                  ref={videoPlayerRef}
                  src={currentViewedStory.mediaUrl}
                  autoPlay
                  playsInline
                  loop
                  className="w-full h-full object-cover"
                />
              ) : currentViewedStory.type === 'text' ? (
                <div className={`w-full h-full bg-gradient-to-br ${currentViewedStory.textGradient || 'from-violet-900 via-indigo-950 to-blue-900'} p-8 flex items-center justify-center text-center`}>
                  <p className={`text-xl sm:text-2xl text-white drop-shadow-lg leading-relaxed ${getFontFamilyClass(currentViewedStory.fontStyle)}`}>
                    {currentViewedStory.textContent}
                  </p>
                </div>
              ) : (
                <img
                  src={currentViewedStory.mediaUrl}
                  alt={currentViewedStory.caption || 'Story'}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Navigation click triggers */}
              <div
                onClick={() => {
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex(activeStoryIndex - 1);
                    setStoryProgress(0);
                  }
                }}
                className="absolute left-0 inset-y-0 w-1/3 cursor-pointer z-20"
              />
              <div
                onClick={() => {
                  if (activeStoryIndex < visibleStories.length - 1) {
                    setActiveStoryIndex(activeStoryIndex + 1);
                    setStoryProgress(0);
                  } else {
                    setActiveStoryIndex(null);
                  }
                }}
                className="absolute right-0 inset-y-0 w-1/3 cursor-pointer z-20"
              />
            </div>

            {/* Bottom Caption & Fast Reactions */}
            <div className="absolute bottom-0 inset-x-0 p-4 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-3">
              {/* Sponsored Banner if ad */}
              {currentViewedStory.isSponsored && (
                <div className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-950/90 to-pink-950/90 border border-violet-500/40 backdrop-blur-md flex items-center justify-between gap-2 shadow-lg">
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase text-pink-300 tracking-wider">
                      {currentViewedStory.sponsorBadge || 'PUBLICITÉ OFFICIELLE'}
                    </span>
                    <p className="text-xs font-bold text-white truncate">
                      {currentViewedStory.sponsorName || currentViewedStory.userName}
                    </p>
                  </div>

                  {currentViewedStory.sponsorUrl && (
                    <a
                      href={currentViewedStory.sponsorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs shrink-0 shadow-md flex items-center gap-1 transition"
                    >
                      <span>Voir l'offre</span>
                    </a>
                  )}
                </div>
              )}

              {currentViewedStory.caption && (
                <p className="text-sm font-medium text-white text-center drop-shadow-md">
                  {currentViewedStory.caption}
                </p>
              )}

              <div className="flex items-center justify-center gap-3">
                {['❤️', '🔥', '👏', '😍', '😂', '🎉'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactStory(currentViewedStory.id, emoji)}
                    className="text-xl p-2 rounded-full bg-white/10 hover:bg-white/25 hover:scale-125 transition active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
