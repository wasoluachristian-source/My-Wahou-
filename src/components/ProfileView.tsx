import { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  User,
  Crown,
  Image as ImageIcon,
  PhoneCall,
  Zap,
  Upload,
  Copy,
  Check,
  Hash,
  LogOut,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { updateUserInDb } from '../services/dbService';
import { compressAvatarImage } from '../utils/mediaUtils';
import { AbonnementsView } from './AbonnementsView';
import { EntrepriseView } from './EntrepriseView';

export type ProfileSubTab = 'profil' | 'abonnements' | 'entreprise';

interface ProfileViewProps {
  currentUser: UserProfile;
  appSettings: AppSettings;
  activeTab?: ProfileSubTab;
  onTabChange?: (tab: ProfileSubTab) => void;
  onOpenForfaitModal: (type?: 'media' | 'call' | 'vip') => void;
  onOpenJourneeLive?: () => void;
  onLogout: () => void;
}

export function ProfileView({
  currentUser,
  appSettings,
  activeTab = 'profil',
  onTabChange,
  onOpenForfaitModal,
  onOpenJourneeLive,
  onLogout,
}: ProfileViewProps) {
  const [currentTab, setCurrentTab] = useState<ProfileSubTab>(activeTab);
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  const handleSelectTab = (tab: ProfileSubTab) => {
    setCurrentTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

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
      console.error('Error uploading photo:', err);
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
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="profile-space-container"
      className="flex-1 h-full bg-zinc-950 flex flex-col overflow-hidden select-none"
    >
      {/* Top Segmented Sub-Navigation Bar */}
      <div className="px-4 sm:px-8 pt-4 pb-2 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
            {/* Tab 1: Mon Profil */}
            <button
              id="profile-subtab-btn-profil"
              onClick={() => handleSelectTab('profil')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                currentTab === 'profil'
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Mon Profil</span>
            </button>

            {/* Tab 2: Mes Abonnements */}
            <button
              id="profile-subtab-btn-abonnements"
              onClick={() => handleSelectTab('abonnements')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                currentTab === 'abonnements'
                  ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Mes Abonnements</span>
            </button>

            {/* Tab 3: Entreprise & Pubs */}
            <button
              id="profile-subtab-btn-entreprise"
              onClick={() => handleSelectTab('entreprise')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                currentTab === 'entreprise'
                  ? 'bg-gradient-to-r from-amber-600 to-pink-600 text-white shadow-md shadow-pink-600/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Building2 className="w-4 h-4 text-pink-400" />
              <span>Entreprise & Pubs</span>
            </button>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-900/50 transition shrink-0"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Sub-view Content */}
      <div className="flex-1 overflow-y-auto">
        {/* SUBTAB 1: MON PROFIL */}
        {currentTab === 'profil' && (
          <div className="p-4 sm:p-8">
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-violet-600/30">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">Mon Profil Personnel</h2>
                    <p className="text-xs text-zinc-400">
                      Personnalisez votre photo, nom public, statut et paramètres
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Card & Avatar Selection */}
              <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar with upload overlay */}
                  <div className="relative group shrink-0">
                    <img
                      src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                      alt={currentUser.displayName}
                      className="w-28 h-28 rounded-3xl object-cover border-2 border-violet-500 shadow-2xl shadow-violet-500/30"
                    />
                    {currentUser.isVIP && (
                      <span className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-amber-500 text-zinc-950 shadow-lg">
                        <Crown className="w-4 h-4" />
                      </span>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
                      title="Changer ma photo"
                    >
                      <Upload className="w-6 h-6 mb-1 text-violet-300" />
                      <span className="text-[11px] font-bold">Changer</span>
                    </button>
                  </div>

                  {/* Avatar actions & Info */}
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        id="profile-view-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-violet-600/30 active:scale-95"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingPhoto ? 'Traitement...' : 'Choisir dans la galerie / ordinateur'}</span>
                      </button>
                    </div>

                    {/* Unique Profile Tag */}
                    <div className="inline-flex items-center gap-2 bg-violet-950/70 border border-violet-500/30 px-3 py-1.5 rounded-xl">
                      <Hash className="w-4 h-4 text-violet-400" />
                      <span className="font-mono font-bold text-xs text-violet-200">
                        {currentUser.profileTag || '#MonProfil@'}
                      </span>
                      <button
                        onClick={handleCopyTag}
                        className="p-1 rounded text-violet-400 hover:text-white transition"
                        title="Copier mon identifiant"
                      >
                        {copiedTag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase">
                    Ou choisir parmi les avatars par défaut :
                  </label>
                  <div className="flex items-center gap-3">
                    {defaultAvatars.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Avatar"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-11 h-11 rounded-2xl object-cover cursor-pointer border-2 transition ${
                          avatarUrl === url
                            ? 'border-violet-500 scale-105 shadow-md shadow-violet-500/30'
                            : 'border-zinc-800 opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">
                      Nom ou Pseudo public
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">
                      Statut d'humeur
                    </label>
                    <input
                      type="text"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="Ex: Sur my Wahou ! 💬"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  {savedSuccess ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Profil mis à jour avec succès !
                    </span>
                  ) : <div />}

                  <button
                    id="save-profile-space-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition hover:opacity-95"
                  >
                    {isSaving ? 'Enregistrement...' : 'Sauvegarder mon profil'}
                  </button>
                </div>
              </div>

              {/* QUICK SECTION 1: MES ABONNEMENTS */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/20 via-zinc-900/70 to-zinc-950 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Mes Abonnements & Quotas</h4>
                      <p className="text-xs text-zinc-400">
                        {currentUser.isVIP
                          ? '👑 Vous bénéficiez du statut VIP Illimité'
                          : `${currentUser.mediaQuota || 0} crédits médias • ${currentUser.callMinutes || 0} minutes d'appels`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTab('abonnements')}
                    className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
                  >
                    <span>Gérer</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => onOpenForfaitModal('vip')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition shadow-md flex items-center gap-1.5"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Pass VIP Illimité (10$)</span>
                  </button>

                  <button
                    onClick={() => onOpenForfaitModal('media')}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                    <span>Pack Médias (+20)</span>
                  </button>

                  <button
                    onClick={() => onOpenForfaitModal('call')}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pack Appels (+60 min)</span>
                  </button>
                </div>
              </div>

              {/* QUICK SECTION 2: ESPACE ENTREPRISE & PARTENARIATS */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-pink-950/20 via-zinc-900/70 to-zinc-950 border border-pink-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Espace Entreprise & Publicités</h4>
                    <p className="text-xs text-zinc-400">
                      Diffusez vos annonces et sponsorisez vos offres auprès de tous les utilisateurs
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTab('entreprise')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-md shadow-pink-600/20"
                >
                  <span>Accéder à l'Espace Pubs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Signature */}
              <div className="pt-4 border-t border-zinc-900 text-center">
                <p className="text-xs font-semibold text-zinc-500">
                  ⚡ <span className="text-violet-400">développer part wastus spart 2026</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: MES ABONNEMENTS */}
        {currentTab === 'abonnements' && (
          <AbonnementsView
            currentUser={currentUser}
            onOpenForfaitModal={onOpenForfaitModal}
          />
        )}

        {/* SUBTAB 3: ESPACE ENTREPRISE */}
        {currentTab === 'entreprise' && (
          <EntrepriseView
            currentUser={currentUser}
            appSettings={appSettings}
            onOpenJourneeLive={onOpenJourneeLive}
          />
        )}
      </div>
    </div>
  );
}
