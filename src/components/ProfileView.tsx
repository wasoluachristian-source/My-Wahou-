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
  Building2,
  ChevronRight,
  ArrowRight,
  Trash2,
  Camera,
  Palette,
  Shield,
  KeyRound,
  Music,
  Volume2,
  Play,
  Square,
  Bell,
  BellRing,
  FileAudio
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { updateUserInDb } from '../services/dbService';
import { compressAvatarImage } from '../utils/mediaUtils';
import { isPasswordConfigured } from '../utils/securityUtils';
import {
  MY_WAHOU_RINGTONES,
  startSelectedRingtone,
  requestPushNotificationPermission,
  showBrowserNotification,
} from '../utils/soundUtils';
import {
  saveCustomRingtoneFile,
  deleteCustomRingtoneFile,
  saveUserRingtoneMeta,
  getUserRingtoneMeta,
  saveBackgroundNotifConfig,
} from '../utils/ringtoneStorage';
import { AbonnementsView } from './AbonnementsView';
import { EntrepriseView } from './EntrepriseView';
import { AppWallpaperCustomizer } from './AppWallpaperCustomizer';
import { UserAvatar } from './UserAvatar';
import { SetPasswordModal } from './SetPasswordModal';

export type ProfileSubTab = 'profil' | 'theme' | 'abonnements' | 'entreprise';

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
  const localRingtoneMeta = getUserRingtoneMeta(currentUser.id);
  const [currentTab, setCurrentTab] = useState<ProfileSubTab>(activeTab);
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ringtone state
  const [selectedRingtoneId, setSelectedRingtoneId] = useState<string>(
    currentUser.ringtoneId || localRingtoneMeta.ringtoneId || 'wahou_1'
  );
  const [customRingtoneName, setCustomRingtoneName] = useState<string>(
    currentUser.customRingtoneName || localRingtoneMeta.customRingtoneName || ''
  );
  const [previewingRingtoneId, setPreviewingRingtoneId] = useState<string | null>(null);
  const [isSavingRingtone, setIsSavingRingtone] = useState(false);
  const [ringtoneStatus, setRingtoneStatus] = useState<string>('');
  const previewStopRef = useRef<(() => void) | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
    } catch {
      return 'default';
    }
  });
  const [backgroundNotifEnabled, setBackgroundNotifEnabled] = useState<boolean>(
    currentUser.backgroundNotificationsEnabled !== false
  );
  const [notifFeedback, setNotifFeedback] = useState<string>('');

  const hasPassword = isPasswordConfigured(currentUser);

  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (previewStopRef.current) {
        previewStopRef.current();
        previewStopRef.current = null;
      }
    };
  }, []);

  const stopRingtonePreview = () => {
    if (previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
    }
    setPreviewingRingtoneId(null);
  };

  const handleTogglePreviewRingtone = (ringtoneId: string) => {
    if (previewingRingtoneId === ringtoneId) {
      stopRingtonePreview();
      return;
    }
    stopRingtonePreview();
    setPreviewingRingtoneId(ringtoneId);
    previewStopRef.current = startSelectedRingtone(
      ringtoneId,
      currentUser.id,
      false,
      () => setPreviewingRingtoneId(null)
    );
  };

  const handleSelectPresetRingtone = async (ringtoneId: string) => {
    setSelectedRingtoneId(ringtoneId);
    setIsSavingRingtone(true);
    saveUserRingtoneMeta(currentUser.id, ringtoneId, customRingtoneName);
    try {
      await updateUserInDb(currentUser.id, { ringtoneId });
      const chosen = MY_WAHOU_RINGTONES.find((r) => r.id === ringtoneId);
      setRingtoneStatus(`Sonnerie « ${chosen?.name || ringtoneId} » enregistrée !`);
      setTimeout(() => setRingtoneStatus(''), 3000);
    } catch (err) {
      console.error('Error saving ringtone:', err);
    } finally {
      setIsSavingRingtone(false);
    }
  };

  const handleAudioFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopRingtonePreview();
    setIsSavingRingtone(true);
    try {
      await saveCustomRingtoneFile(currentUser.id, file);
      setSelectedRingtoneId('custom_file');
      setCustomRingtoneName(file.name);
      await updateUserInDb(currentUser.id, {
        ringtoneId: 'custom_file',
        customRingtoneName: file.name,
      });
      setRingtoneStatus(`Musique « ${file.name} » définie comme sonnerie !`);
      setTimeout(() => setRingtoneStatus(''), 4000);
      // Preview automatically on upload
      setPreviewingRingtoneId('custom_file');
      previewStopRef.current = startSelectedRingtone(
        'custom_file',
        currentUser.id,
        false,
        () => setPreviewingRingtoneId(null)
      );
    } catch (err) {
      console.error('Error loading custom audio:', err);
      setRingtoneStatus('Impossible de charger ce fichier audio.');
    } finally {
      setIsSavingRingtone(false);
      e.target.value = '';
    }
  };

  const handleDeleteCustomRingtone = async () => {
    stopRingtonePreview();
    await deleteCustomRingtoneFile(currentUser.id);
    setCustomRingtoneName('');
    const fallbackId = 'wahou_1';
    setSelectedRingtoneId(fallbackId);
    saveUserRingtoneMeta(currentUser.id, fallbackId, '');
    await updateUserInDb(currentUser.id, {
      ringtoneId: fallbackId,
      customRingtoneName: '',
    });
    setRingtoneStatus('Musique personnalisée supprimée.');
    setTimeout(() => setRingtoneStatus(''), 3000);
  };

  const handleEnableNotifications = async () => {
    const perm = await requestPushNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setBackgroundNotifEnabled(true);
      await updateUserInDb(currentUser.id, {
        notificationsEnabled: true,
        backgroundNotificationsEnabled: true,
      });
      await saveBackgroundNotifConfig({
        userId: currentUser.id,
        displayName: currentUser.displayName,
        enabled: true,
        updatedAt: Date.now(),
      });
      setNotifFeedback('Notifications activées même hors connexion !');
      showBrowserNotification(
        'my Wahou',
        'Notifications activées ! Vous recevrez vos alertes même hors de l’application.',
        '/bird-logo.png'
      );
    } else {
      setNotifFeedback('Autorisez les notifications dans les paramètres de votre navigateur.');
    }
    setTimeout(() => setNotifFeedback(''), 4000);
  };

  const handleToggleBackgroundNotif = async () => {
    const nextVal = !backgroundNotifEnabled;
    setBackgroundNotifEnabled(nextVal);
    if (nextVal && notifPermission !== 'granted') {
      const perm = await requestPushNotificationPermission();
      setNotifPermission(perm);
    }
    await updateUserInDb(currentUser.id, {
      backgroundNotificationsEnabled: nextVal,
    });
    await saveBackgroundNotifConfig({
      userId: currentUser.id,
      displayName: currentUser.displayName,
      enabled: nextVal,
      updatedAt: Date.now(),
    });
    setNotifFeedback(
      nextVal
        ? 'Notifications hors session activées.'
        : 'Notifications hors session désactivées.'
    );
    setTimeout(() => setNotifFeedback(''), 3000);
  };

  const handleSelectTab = (tab: ProfileSubTab) => {
    stopRingtonePreview();
    setCurrentTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const compressedBase64 = await compressAvatarImage(file);
      setAvatarUrl(compressedBase64);
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
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
      className="flex-1 h-full bg-transparent flex flex-col overflow-hidden select-none"
    >
      {/* Top Segmented Sub-Navigation Bar - Frosted Titanium */}
      <div className="px-4 sm:px-8 pt-4 pb-2 border-b border-zinc-200 dark:border-white/10 glass-titanium shrink-0 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-xl">
            {/* Tab 1: Mon Profil */}
            <button
              id="profile-subtab-btn-profil"
              onClick={() => {
                handleSelectTab('profil');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                currentTab === 'profil'
                  ? 'glass-pill-active text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
              <span>Mon Profil</span>
            </button>

            {/* Tab 2: Personnalisation (Fond & Thème) */}
            <button
              id="profile-subtab-btn-theme"
              onClick={() => {
                handleSelectTab('theme');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                currentTab === 'theme'
                  ? 'bg-gradient-to-r from-violet-600/90 to-pink-600/90 border border-violet-400/40 text-white shadow-lg'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5'
              }`}
            >
              <Palette className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              <span>Personnaliser l'App</span>
            </button>

            {/* Tab 3: Mes Abonnements */}
            <button
              id="profile-subtab-btn-abonnements"
              onClick={() => {
                handleSelectTab('abonnements');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                currentTab === 'abonnements'
                  ? 'bg-gradient-to-r from-amber-500/90 to-pink-600/90 border border-amber-400/40 text-white shadow-lg'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Mes Abonnements</span>
            </button>

            {/* Tab 4: Entreprise & Pubs */}
            <button
              id="profile-subtab-btn-entreprise"
              onClick={() => {
                handleSelectTab('entreprise');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                currentTab === 'entreprise'
                  ? 'bg-gradient-to-r from-cyan-600/90 to-violet-600/90 border border-cyan-400/40 text-white shadow-lg'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5'
              }`}
            >
              <Building2 className="w-4 h-4 text-pink-500 dark:text-pink-400" />
              <span>Entreprise & Pubs</span>
            </button>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-500/20 transition shrink-0 active:scale-95"
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
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-violet-600/30">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">Mon Profil Personnel</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Personnalisez votre photo, nom public, statut et paramètres
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Card & Avatar Selection */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white/85 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar preview */}
                  <div className="relative group shrink-0">
                    <UserAvatar
                      name={displayName}
                      avatarUrl={avatarUrl}
                      size="2xl"
                      isVIP={currentUser.isVIP}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
                      title="Changer ma photo"
                    >
                      <Camera className="w-6 h-6 mb-1 text-violet-300" />
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
                        <span>
                          {isUploadingPhoto
                            ? 'Traitement...'
                            : avatarUrl
                            ? 'Changer ma photo'
                            : 'Importer ma photo'}
                        </span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-red-500 dark:hover:text-red-400 font-bold text-xs flex items-center gap-1.5 transition"
                          title="Supprimer la photo et utiliser l'avatar dégradé"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer photo</span>
                        </button>
                      )}
                    </div>

                    {/* Unique Profile Tag */}
                    <div className="inline-flex items-center gap-2 bg-violet-500/10 dark:bg-violet-950/70 border border-violet-500/30 px-3 py-1.5 rounded-xl">
                      <Hash className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span className="font-mono font-bold text-xs text-violet-800 dark:text-violet-200">
                        {currentUser.profileTag || '#MonProfil@'}
                      </span>
                      <button
                        onClick={handleCopyTag}
                        className="p-1 rounded text-violet-600 dark:text-violet-400 hover:text-zinc-900 dark:hover:text-white transition"
                        title="Copier mon identifiant"
                      >
                        {copiedTag ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase">
                      Nom ou Pseudo public
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase">
                      Statut personnel
                    </label>
                    <input
                      type="text"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="Ex: Sur my Wahou ! 💬"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase">
                    Biographie
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Présentez-vous en quelques mots..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-violet-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  {savedSuccess ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Profil mis à jour avec succès !
                    </span>
                  ) : (
                    <div />
                  )}

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

              {/* SECTION SÉCURITÉ & MOT DE PASSE */}
              <div className="p-6 rounded-3xl bg-white/85 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      hasPassword
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Sécurité du compte & Mot de passe</h4>
                      {hasPassword ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          Protégé 🔒
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          Non configuré ⚠️
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {hasPassword
                        ? 'Votre compte est sécurisé. Votre mot de passe est obligatoire pour se connecter.'
                        : 'Configurez votre mot de passe pour que personne d’autre ne puisse se connecter à votre compte.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="open-security-password-btn"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 text-zinc-900 dark:text-white font-bold text-xs transition flex items-center gap-2 shrink-0 active:scale-95"
                >
                  <KeyRound className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                  <span>{hasPassword ? 'Modifier le mot de passe' : 'Configurer mon mot de passe 🔒'}</span>
                </button>
              </div>

              {/* SECTION SONNERIE POUR LES APPELS (10 SONNERIES MY WAHOU + MUSIQUE DU TÉLÉPHONE) */}
              <div
                id="profile-ringtone-section"
                className="p-6 rounded-3xl bg-white/90 dark:bg-zinc-900/75 border border-cyan-500/30 space-y-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/25">
                      <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>Sonnerie pour les appels</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          10 sons + Fichier
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Sonnerie active :{' '}
                        <strong className="text-violet-600 dark:text-violet-300">
                          {selectedRingtoneId === 'custom_file'
                            ? customRingtoneName || 'Musique du téléphone'
                            : MY_WAHOU_RINGTONES.find((r) => r.id === selectedRingtoneId)?.name ||
                              'Carillon my Wahou'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {ringtoneStatus && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
                      <Check className="w-3.5 h-3.5" />
                      <span>{ringtoneStatus}</span>
                    </span>
                  )}
                </div>

                {/* Upload a song from phone / device files */}
                <div className="p-4 rounded-2xl bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
                    onChange={handleAudioFileChange}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0 border border-violet-500/25">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {customRingtoneName
                          ? `Musique du téléphone : ${customRingtoneName}`
                          : 'Choisir une musique de votre téléphone'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Importez une chanson (MP3, M4A, WAV, OGG, AAC) depuis vos fichiers
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {customRingtoneName && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTogglePreviewRingtone('custom_file')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                            previewingRingtoneId === 'custom_file'
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {previewingRingtoneId === 'custom_file' ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Arrêter</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Écouter</span>
                            </>
                          )}
                        </button>

                        {selectedRingtoneId !== 'custom_file' && (
                          <button
                            type="button"
                            onClick={() => handleSelectPresetRingtone('custom_file')}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95"
                          >
                            Utiliser
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleDeleteCustomRingtone}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition"
                          title="Supprimer cette chanson"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      id="upload-custom-ringtone-btn"
                      onClick={() => audioFileInputRef.current?.click()}
                      disabled={isSavingRingtone}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/25 transition active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{customRingtoneName ? 'Changer de musique' : 'Choisir depuis fichier'}</span>
                    </button>
                  </div>
                </div>

                {/* Grid of 10 exclusive my Wahou ringtones */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-500" />
                    <span>10 sonneries officielles my Wahou</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {MY_WAHOU_RINGTONES.map((preset, idx) => {
                      const isSelected = selectedRingtoneId === preset.id;
                      const isPreviewing = previewingRingtoneId === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-violet-500/10 dark:bg-violet-950/40 border-violet-500/60 shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:border-violet-400/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-xl text-[11px] font-black flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-gradient-to-tr from-violet-600 to-pink-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {preset.name}
                              </p>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {preset.style} • {preset.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTogglePreviewRingtone(preset.id)}
                              className={`p-2 rounded-xl transition active:scale-95 ${
                                isPreviewing
                                  ? 'bg-pink-600 text-white shadow-sm'
                                  : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                              }`}
                              title={isPreviewing ? 'Arrêter l’aperçu' : 'Écouter la sonnerie'}
                            >
                              {isPreviewing ? (
                                <Square className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectPresetRingtone(preset.id)}
                              disabled={isSavingRingtone}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition active:scale-95 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-sm'
                                  : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-violet-600 hover:text-white text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {isSelected ? 'Activée ✓' : 'Choisir'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION NOTIFICATIONS PUSH & HORS CONNEXION */}
              <div
                id="profile-notifications-section"
                className="p-6 rounded-3xl bg-white/90 dark:bg-zinc-900/75 border border-emerald-500/30 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                          Notifications & Alertes hors connexion
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            notifPermission === 'granted'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {notifPermission === 'granted'
                            ? 'Autorisées ✓'
                            : notifPermission === 'denied'
                            ? 'Bloquées par le navigateur'
                            : 'À activer'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Recevez vos notifications de messages et d’appels même lorsque vous n’êtes pas connecté sur l’application
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {notifPermission !== 'granted' ? (
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Activer les notifications</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          showBrowserNotification(
                            'my Wahou',
                            'Test réussi : les notifications fonctionnent même hors session !',
                            '/bird-logo.png'
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Bell className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tester une notification</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      Recevoir les alertes même si je suis déconnecté
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Garde la veille Service Worker & Push active en arrière-plan pour votre compte
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={backgroundNotifEnabled}
                    onClick={handleToggleBackgroundNotif}
                    className={`w-12 h-6 rounded-full p-0.5 transition shrink-0 ${
                      backgroundNotifEnabled
                        ? 'bg-emerald-500'
                        : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        backgroundNotifEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {notifFeedback && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {notifFeedback}
                  </p>
                )}
              </div>

              {/* QUICK SECTION 1: MES ABONNEMENTS */}
              <div className="p-6 rounded-3xl bg-white/90 dark:bg-gradient-to-br dark:from-amber-950/20 dark:via-zinc-900/70 dark:to-zinc-950 border border-amber-500/30 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Mes Abonnements & Quotas</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {currentUser.isVIP
                          ? '👑 Vous bénéficiez du statut VIP Illimité'
                          : `${currentUser.mediaQuota || 0} crédits médias • ${
                              currentUser.callMinutes || 0
                            } minutes d'appels`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTab('abonnements')}
                    className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition"
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
                    className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                    <span>Pack Médias (+20)</span>
                  </button>

                  <button
                    onClick={() => onOpenForfaitModal('call')}
                    className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    <span>Pack Appels (+60 min)</span>
                  </button>
                </div>
              </div>

              {/* QUICK SECTION 2: PERSONNALISATION DE L'APPLICATION */}
              <div className="p-6 rounded-3xl bg-white/90 dark:bg-gradient-to-br dark:from-violet-950/30 dark:via-zinc-900/70 dark:to-zinc-950 border border-violet-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Thème Clair / Sombre & Fond d'application</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Basculez entre le mode Clair / Sombre ou choisissez une image de fond
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTab('theme')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-md shadow-violet-600/20 active:scale-95"
                >
                  <span>Apparence & Thème</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* QUICK SECTION 3: ESPACE ENTREPRISE & PARTENARIATS */}
              <div className="p-6 rounded-3xl bg-white/90 dark:bg-gradient-to-br dark:from-pink-950/20 dark:via-zinc-900/70 dark:to-zinc-950 border border-pink-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Espace Entreprise & Publicités</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900 text-center">
                <p className="text-xs font-semibold text-zinc-500">
                  ⚡ <span className="text-violet-600 dark:text-violet-400">développé par Wastus Spart 2026</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: PERSONNALISATION THEME & FOND D'ECRAN */}
        {currentTab === 'theme' && (
          <div className="p-4 sm:p-8">
            <div className="max-w-4xl mx-auto w-full">
              <AppWallpaperCustomizer />
            </div>
          </div>
        )}

        {/* SUBTAB 3: MES ABONNEMENTS */}
        {currentTab === 'abonnements' && (
          <AbonnementsView
            currentUser={currentUser}
            onOpenForfaitModal={onOpenForfaitModal}
          />
        )}

        {/* SUBTAB 4: ESPACE ENTREPRISE */}
        {currentTab === 'entreprise' && (
          <EntrepriseView
            currentUser={currentUser}
            appSettings={appSettings}
            onOpenJourneeLive={onOpenJourneeLive}
          />
        )}
      </div>

      {/* Modal to configure or change password */}
      <SetPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        user={currentUser}
        title={hasPassword ? 'Modifier votre mot de passe' : 'Configurer votre mot de passe'}
        description={
          hasPassword
            ? 'Mettez à jour votre mot de passe pour continuer à protéger vos discussions.'
            : 'Enregistrez votre mot de passe pour sécuriser définitivement votre compte contre tout accès non autorisé.'
        }
        onPasswordSet={(updated) => {
          currentUser.passwordHash = updated.passwordHash;
          currentUser.hasPassword = true;
          setIsPasswordModalOpen(false);
        }}
      />
    </div>
  );
}
