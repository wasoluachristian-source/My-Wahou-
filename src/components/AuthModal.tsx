import { useState, FormEvent, ChangeEvent, useRef } from 'react';
import {
  Mail,
  KeyRound,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UserPlus,
  LogIn,
  Smile,
  MessageSquare,
  Hash,
  Upload,
  Camera,
  X
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  ADMIN_EMAIL,
  ADMIN_PASS,
  ADMIN_PROFILE_TAG,
  saveUserToDb,
  INITIAL_USERS,
  normalizeProfileTag,
  generateDefaultProfileTag,
  isProfileTagAvailable,
  getDeterministicUserId,
} from '../services/dbService';
import { compressAvatarImage } from '../utils/mediaUtils';
import { UserAvatar } from './UserAvatar';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserProfile) => void;
  allUsers: UserProfile[];
}

export function AuthModal({ isOpen, onLoginSuccess, allUsers }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Form Fields
  const [emailInput, setEmailInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [profileTagInput, setProfileTagInput] = useState('');
  const [statusInput, setStatusInput] = useState('Nouveau sur my Wahou ! 💬');
  const [passwordInput, setPasswordInput] = useState('');
  const [customAvatarBase64, setCustomAvatarBase64] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const base64 = await compressAvatarImage(file);
      setCustomAvatarBase64(base64);
    } catch (err) {
      console.error('Error compressing avatar:', err);
      alert('Impossible de charger cette photo. Veuillez choisir un autre fichier.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Step 1: Validate Email before moving to Nickname step
  const handleProceedToNicknameStep = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const emailClean = emailInput.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@') || !emailClean.includes('.')) {
      setErrorMessage('Veuillez entrer une adresse email valide.');
      return;
    }

    // Check if email already exists in DB
    const existing = allUsers.find((u) => u.email.toLowerCase() === emailClean);
    if (existing) {
      setErrorMessage(
        'Un compte existe déjà avec cette adresse email. Veuillez basculer sur "Se connecter".'
      );
      return;
    }

    // Pre-populate suggested nickname from email prefix
    let suggestedName = nicknameInput;
    if (!suggestedName) {
      const raw = emailClean.split('@')[0].replace(/[._-]/g, ' ');
      suggestedName = raw.charAt(0).toUpperCase() + raw.slice(1);
      setNicknameInput(suggestedName);
    }

    // Auto generate unique profile tag if not set yet
    if (!profileTagInput) {
      const autoTag = generateDefaultProfileTag(suggestedName || 'User', allUsers);
      setProfileTagInput(autoTag);
    }

    setRegisterStep(2);
  };

  // Step 2: Finalize Registration
  const handleFinalizeRegistration = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedNickname = nicknameInput.trim();
    if (!trimmedNickname || trimmedNickname.length < 2) {
      setErrorMessage('Le nom de profil / surnom doit comporter au moins 2 caractères.');
      return;
    }

    const emailClean = emailInput.trim().toLowerCase();
    const isTargetAdmin = emailClean === ADMIN_EMAIL.toLowerCase();

    // Format & validate unique profile tag
    const rawTag = profileTagInput.trim() || trimmedNickname;
    const finalTag = isTargetAdmin ? ADMIN_PROFILE_TAG : normalizeProfileTag(rawTag);

    if (!finalTag || finalTag.length < 4) {
      setErrorMessage("L'identifiant unique doit être au format #NomTag@ (ex: #Spart20@).");
      return;
    }

    if (!isTargetAdmin && !isProfileTagAvailable(finalTag, allUsers)) {
      setErrorMessage(
        `L'identifiant unique ${finalTag} est déjà utilisé par un autre membre. Veuillez en choisir un autre.`
      );
      return;
    }

    setLoading(true);
    try {
      const stableUserId = getDeterministicUserId(emailClean, allUsers);
      const newUser: UserProfile = {
        id: stableUserId,
        email: emailClean,
        displayName: trimmedNickname,
        profileTag: finalTag,
        avatarUrl: customAvatarBase64 || '',
        bio: isTargetAdmin ? '⚡ Administrateur Principal my Wahou' : 'Membre my Wahou',
        role: isTargetAdmin ? 'admin' : 'user',
        isBlocked: false,
        mediaQuota: isTargetAdmin ? 9999 : 5, // 5 starter free media sends
        callMinutes: isTargetAdmin ? 9999 : 10, // 10 starter call minutes
        isVIP: isTargetAdmin ? true : false,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        statusText: statusInput.trim() || 'Nouveau sur my Wahou ! 💬',
        isOnline: true,
      };

      await saveUserToDb(newUser);
      onLoginSuccess(newUser);
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMessage('Impossible de créer le compte. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login submission
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const emailClean = emailInput.trim().toLowerCase();
    if (!emailClean) {
      setErrorMessage('Veuillez renseigner votre adresse email.');
      setLoading(false);
      return;
    }

    try {
      // Check Admin Login credentials
      if (emailClean === ADMIN_EMAIL.toLowerCase()) {
        if (passwordInput !== ADMIN_PASS) {
          setErrorMessage('Mot de passe Administrateur incorrect.');
          setLoading(false);
          return;
        }

        let adminUser = allUsers.find(
          (u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        );
        if (!adminUser) {
          adminUser = INITIAL_USERS[0];
          await saveUserToDb(adminUser);
        } else if (adminUser.role !== 'admin') {
          adminUser.role = 'admin';
          adminUser.isVIP = true;
          adminUser.mediaQuota = 9999;
          adminUser.callMinutes = 9999;
          await saveUserToDb(adminUser);
        }
        onLoginSuccess(adminUser);
        return;
      }

      // Check standard user
      const existingUser = allUsers.find((u) => u.email.toLowerCase() === emailClean);
      if (existingUser) {
        if (existingUser.isBlocked) {
          setErrorMessage('Ce compte a été suspendu par l’administrateur du réseau.');
          setLoading(false);
          return;
        }
        existingUser.role = 'user';
        onLoginSuccess(existingUser);
      } else {
        setErrorMessage(
          'Aucun compte trouvé avec cet email. Voulez-vous créer votre compte ?'
        );
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="auth-container"
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Branding Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 text-white shadow-lg shadow-violet-500/25 mb-3">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            my Wahou
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Messagerie instantanée texte & vocale gratuite sans forfaits
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-2xl bg-zinc-900/90 p-1 mb-5 border border-zinc-800 relative z-10">
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setRegisterStep(1);
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>1. Créer un compte</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>2. Se connecter</span>
          </button>
        </div>

        {/* MODE 1: CRÉER UN COMPTE */}
        {authMode === 'register' && (
          <div className="relative z-10">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    registerStep === 1
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/50'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {registerStep > 1 ? '✓' : '1'}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    registerStep === 1 ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  Compte Email
                </span>
              </div>

              <div className="h-0.5 w-8 bg-zinc-800 mx-2" />

              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    registerStep === 2
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/50'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  2
                </span>
                <span
                  className={`text-xs font-semibold ${
                    registerStep === 2 ? 'text-white' : 'text-zinc-500'
                  }`}
                >
                  Surnom & Photo
                </span>
              </div>
            </div>

            {/* STEP 1: EMAIL */}
            {registerStep === 1 && (
              <form onSubmit={handleProceedToNicknameStep} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Votre adresse email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-register-email-input"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="votre.email@exemple.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-600 transition"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Votre email servira à retrouver vos conversations et sauvegardes de façon permanente.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                <button
                  id="auth-register-step1-btn"
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Continuer : Définir mon profil</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: NICKNAME & PHOTO */}
            {registerStep === 2 && (
              <form onSubmit={handleFinalizeRegistration} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep(1);
                      setErrorMessage('');
                    }}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Modifier l'email ({emailInput})</span>
                  </button>
                </div>

                {/* Surnom / Nom d'utilisateur */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Surnom / Nom public <span className="text-pink-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-register-nickname-input"
                      type="text"
                      required
                      value={nicknameInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNicknameInput(val);
                        if (!profileTagInput || profileTagInput.startsWith('#')) {
                          setProfileTagInput(generateDefaultProfileTag(val || 'User', allUsers));
                        }
                      }}
                      placeholder="Ex: Christian, Alex, Samira..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-600 transition"
                    />
                  </div>
                </div>

                {/* Identifiant Unique de Profil */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                      Identifiant Unique de Profil <span className="text-pink-400">*</span>
                    </label>
                    <span className="text-[10px] text-violet-400 font-mono font-bold">
                      Format #Nom20@
                    </span>
                  </div>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-register-profile-tag-input"
                      type="text"
                      required
                      value={profileTagInput}
                      onChange={(e) => setProfileTagInput(e.target.value)}
                      placeholder="Ex: #Spart20@ ou #Alex99@"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-violet-500/50 text-violet-200 font-mono text-sm focus:border-violet-400 focus:outline-none placeholder-zinc-600 transition font-bold"
                    />
                  </div>
                </div>

                {/* Photo de profil personnalisée */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wide">
                    Photo de Profil
                  </label>
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                    <UserAvatar
                      name={nicknameInput || 'Utilisateur'}
                      avatarUrl={customAvatarBase64}
                      size="lg"
                    />

                    <div className="flex-1 space-y-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingPhoto}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>
                            {isProcessingPhoto
                              ? 'Chargement...'
                              : customAvatarBase64
                              ? 'Changer photo'
                              : 'Choisir ma photo'}
                          </span>
                        </button>

                        {customAvatarBase64 && (
                          <button
                            type="button"
                            onClick={() => setCustomAvatarBase64('')}
                            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                            title="Utiliser l'avatar dégradé"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        {customAvatarBase64
                          ? 'Photo importée prête !'
                          : 'Optionnel : Importez votre photo ou utilisez un avatar initiales stylé.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statut rapide */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Statut personnel
                  </label>
                  <div className="relative">
                    <Smile className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value)}
                      placeholder="Ex: Sur my Wahou ! 💬"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:border-violet-500 focus:outline-none placeholder-zinc-600"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                <button
                  id="auth-register-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {loading ? 'Création de votre compte...' : 'Finaliser et Rejoindre my Wahou 🚀'}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* MODE 2: SE CONNECTER */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wide">
                Votre Adresse Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-login-email-input"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-600 transition"
                />
              </div>
            </div>

            {/* Mot de passe si email Admin */}
            {emailInput.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-amber-400 mb-1.5 uppercase flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" /> Mot de passe Administrateur
                </label>
                <input
                  id="auth-admin-password-input"
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Entrez le mot de passe Administrateur"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-amber-500/50 text-white text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-medium space-y-2">
                <p>{errorMessage}</p>
                {errorMessage.includes('Aucun compte trouvé') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setRegisterStep(2);
                      const suggestedName = emailInput.split('@')[0].replace(/[._-]/g, ' ');
                      setNicknameInput(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
                      setErrorMessage('');
                    }}
                    className="underline text-violet-300 hover:text-white font-bold block"
                  >
                    👉 Créer un compte avec cet email ({emailInput})
                  </button>
                )}
              </div>
            )}

            <button
              id="auth-login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'Connexion en cours...' : 'Se connecter à my Wahou'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Developer Credit Footer */}
        <div className="mt-5 pt-3 border-t border-zinc-900/80 text-center relative z-10">
          <p className="text-xs font-semibold text-zinc-500">
            ⚡ <span className="text-violet-400">développer part wastus spart 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
