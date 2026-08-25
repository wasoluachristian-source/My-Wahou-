import { useState, useRef, ChangeEvent } from 'react';
import { User, Mail, Zap, Crown, Image as ImageIcon, PhoneCall, LogOut, Check, X, Upload, Copy, Hash, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserInDb } from '../services/dbService';
import { compressAvatarImage } from '../utils/mediaUtils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onOpenForfaitModal: () => void;
  onLogout: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onOpenForfaitModal,
  onLogout,
}: UserProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const defaultAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  ];

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const compressedBase64 = await compressAvatarImage(file);
      setAvatarUrl(compressedBase64);
    } catch (err) {
      console.error('Error compressing image:', err);
      alert('Erreur lors du traitement de la photo. Veuillez réessayer.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCopyTag = () => {
    if (currentUser.profileTag) {
      navigator.clipboard.writeText(currentUser.profileTag);
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserInDb(currentUser.id, {
        displayName,
        bio,
        avatarUrl,
        statusText,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="profile-container"
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-violet-600/20 text-violet-400">
              <User className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Mon Profil & Paramètres</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Card & Avatar Upload */}
        <div className="my-5 flex flex-col items-center text-center">
          <div className="relative mb-3 group">
            <img
              src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser.displayName}
              className="w-24 h-24 rounded-full object-cover border-2 border-violet-500 shadow-xl shadow-violet-500/25"
            />
            {currentUser.isVIP && (
              <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-500 text-zinc-950 shadow-md">
                <Crown className="w-4 h-4" />
              </span>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
              title="Changer ma photo"
            >
              <Upload className="w-5 h-5 mb-0.5 text-violet-300" />
              <span className="text-[10px] font-bold">Changer</span>
            </button>
          </div>

          {/* Hidden File Input for Phone Gallery / Computer */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Button to choose from gallery/computer */}
          <button
            type="button"
            id="upload-avatar-gallery-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="mb-3 px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-2 transition active:scale-95"
          >
            <Upload className="w-4 h-4 text-violet-400" />
            <span>{isUploadingPhoto ? 'Chargement...' : 'Choisir dans la galerie ou ordinateur'}</span>
          </button>

          <h3 className="text-lg font-bold text-white">{currentUser.displayName}</h3>
          
          {/* Unique Profile Tag (Privacy-first, instead of displaying raw gmail) */}
          <div className="mt-1 flex items-center gap-1.5 bg-violet-950/60 border border-violet-500/30 px-3 py-1 rounded-xl">
            <Hash className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-mono font-bold text-xs text-violet-300">
              {currentUser.profileTag || '#MonProfil@'}
            </span>
            <button
              onClick={handleCopyTag}
              className="p-1 rounded text-violet-400 hover:text-white transition"
              title="Copier mon identifiant"
            >
              {copiedTag ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Quota Balances & Forfait Pass */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400">Statut Forfaits</span>
            {currentUser.isVIP ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                👑 MEMBRE VIP ILLIMITÉ
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
                Standard Gratuit
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-950 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-400 shrink-0" />
              <div>
                <div className="text-[10px] text-zinc-400">Médias (Photos/Vidéos)</div>
                <div className="font-bold text-white">
                  {currentUser.isVIP ? 'Illimité' : `${currentUser.mediaQuota || 0} restants`}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="text-[10px] text-zinc-400">Appels HD</div>
                <div className="font-bold text-white">
                  {currentUser.isVIP ? 'Illimité' : `${currentUser.callMinutes || 0} min`}
                </div>
              </div>
            </div>
          </div>

          <button
            id="open-forfaits-from-profile-btn"
            onClick={() => {
              onClose();
              onOpenForfaitModal();
            }}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Recharger mes forfaits Médias & Appels</span>
          </button>
        </div>

        {/* Editable Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase">
              Nom / Pseudo affiché
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase">
              Statut d'humeur
            </label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="Ex: Sur my Wahou ! 💬"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase">
              Ou choisir parmi les avatars par défaut :
            </label>
            <div className="flex items-center gap-2">
              {defaultAvatars.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Avatar option"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-9 h-9 rounded-full object-cover cursor-pointer border-2 transition ${
                    avatarUrl === url ? 'border-violet-500 scale-105 shadow-md shadow-violet-500/30' : 'border-zinc-800 opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-900/50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>

          <button
            id="save-profile-modal-btn"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/30 transition"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : null}
            <span>{isSaving ? 'Enregistrement...' : savedSuccess ? 'Enregistré !' : 'Sauvegarder'}</span>
          </button>
        </div>

        {/* Official Developer Signature */}
        <div className="mt-4 pt-2 border-t border-zinc-900 text-center">
          <p className="text-[11px] font-semibold text-zinc-500">
            ⚡ <span className="text-violet-400">développer part wastus spart 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
