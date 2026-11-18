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
  Camera,
  X,
  Eye,
  EyeOff,
  Lock,
  Shield,
  AlertCircle
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
import { hashPassword, verifyPassword, isPasswordConfigured } from '../utils/securityUtils';
import { UserAvatar } from './UserAvatar';
import { SetPasswordModal } from './SetPasswordModal';
import { BrandBirdLogo } from './BrandBirdLogo';
import { playUiTapSound } from '../utils/soundUtils';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserProfile) => void;
  allUsers: UserProfile[];
}

export function AuthModal({ isOpen, onLoginSuccess, allUsers }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Form Fields - Register
  const [emailInput, setEmailInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [profileTagInput, setProfileTagInput] = useState('');
  const [statusInput, setStatusInput] = useState('Nouveau sur my Wahou ! 💬');
  const [customAvatarBase64, setCustomAvatarBase64] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // Form Fields - Login
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Existing User needing Password Configuration (Migration / First-time password setup)
  const [configuringUser, setConfiguringUser] = useState<UserProfile | null>(null);

  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // If an existing user was detected without a password, show the dedicated setup modal directly
  if (configuringUser) {
    return (
      <SetPasswordModal
        isOpen={true}
        isMandatory={true}
        user={configuringUser}
        title="Configurer votre mot de passe"
        description="Bienvenue ! Pour sécuriser votre compte existant et empêcher toute personne d'accéder à vos discussions, veuillez enregistrer votre mot de passe maintenant."
        onPasswordSet={(updatedUser) => {
          setConfiguringUser(null);
          onLoginSuccess(updatedUser);
        }}
      />
    );
  }

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
    const existing = allUsers.find((u) => u.email?.toLowerCase() === emailClean);
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

  // Step 2: Finalize Registration (With Password)
  const handleFinalizeRegistration = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedNickname = nicknameInput.trim();
    if (!trimmedNickname || trimmedNickname.length < 2) {
      setErrorMessage('Le nom de profil / surnom doit comporter au moins 2 caractères.');
      return;
    }

    // Password validation for new users
    const trimmedPass = registerPassword.trim();
    const trimmedConfirm = registerConfirmPassword.trim();

    if (!trimmedPass || trimmedPass.length < 4) {
      setErrorMessage('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    if (trimmedPass !== trimmedConfirm) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
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
    playUiTapSound();

    try {
      // Secure hash password
      const passwordHash = await hashPassword(trimmedPass);

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
        mediaQuota: isTargetAdmin ? 9999 : 5,
        callMinutes: isTargetAdmin ? 9999 : 10,
        isVIP: isTargetAdmin ? true : false,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        statusText: statusInput.trim() || 'Nouveau sur my Wahou ! 💬',
        isOnline: true,
        passwordHash,
        hasPassword: true,
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

  // Find target user corresponding to email in login mode
  const currentLoginEmail = emailInput.trim().toLowerCase();
  const matchedLoginUser = allUsers.find(
    (u) => u.email?.toLowerCase().trim() === currentLoginEmail
  );
  const isMatchedUserConfigured = matchedLoginUser
    ? isPasswordConfigured(matchedLoginUser)
    : false;

  // Handle Login submission
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const emailClean = emailInput.trim().toLowerCase();
    if (!emailClean) {
      setErrorMessage('Veuillez renseigner votre adresse email.');
      return;
    }

    setLoading(true);
    playUiTapSound();

    try {
      // 1. Admin login credentials
      if (emailClean === ADMIN_EMAIL.toLowerCase()) {
        if (!loginPasswordInput) {
          setErrorMessage('Veuillez entrer le mot de passe Administrateur.');
          setLoading(false);
          return;
        }

        let adminUser = allUsers.find(
          (u) => u.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()
        );
        if (!adminUser) {
          adminUser = INITIAL_USERS[0];
          await saveUserToDb(adminUser);
        }

        const isMatch = await verifyPassword(loginPasswordInput, adminUser);
        if (!isMatch && loginPasswordInput !== ADMIN_PASS) {
          setErrorMessage('Mot de passe Administrateur incorrect.');
          setLoading(false);
          return;
        }

        if (adminUser.role !== 'admin') {
          adminUser.role = 'admin';
          adminUser.isVIP = true;
          adminUser.mediaQuota = 9999;
          adminUser.callMinutes = 9999;
          await saveUserToDb(adminUser);
        }
        onLoginSuccess(adminUser);
        return;
      }

      // 2. Check standard user
      const existingUser = allUsers.find(
        (u) => u.email?.toLowerCase().trim() === emailClean
      );

      if (!existingUser) {
        setErrorMessage(
          'Aucun compte trouvé avec cet email. Voulez-vous créer votre compte ?'
        );
        setLoading(false);
        return;
      }

      if (existingUser.isBlocked) {
        setErrorMessage('Ce compte a été suspendu par l’administrateur du réseau.');
        setLoading(false);
        return;
      }

      // 3. Check if existing user has NOT configured their password yet!
      const hasPassword = isPasswordConfigured(existingUser);
      if (!hasPassword) {
        // Direct transition to the mandatory password setup screen
        setLoading(false);
        setConfiguringUser(existingUser);
        return;
      }

      // 4. User has a password: verify it
      if (!loginPasswordInput) {
        setErrorMessage('Veuillez saisir votre mot de passe pour vous connecter.');
        setLoading(false);
        return;
      }

      const isValid = await verifyPassword(loginPasswordInput, existingUser);
      if (!isValid) {
        setErrorMessage('Mot de passe incorrect. Veuillez vérifier votre saisie.');
        setLoading(false);
        return;
      }

      // Password valid: Successful login
      existingUser.role = 'user';
      onLoginSuccess(existingUser);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div
        id="auth-container"
        className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 text-zinc-900 dark:text-white shadow-2xl overflow-y-auto max-h-[92dvh] my-auto"
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-600/20 dark:bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-pink-600/15 dark:bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Branding Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex w-16 h-16 p-1 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 shadow-lg shadow-violet-500/25 mb-3">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-white to-sky-50 flex items-center justify-center p-1 overflow-hidden">
              <BrandBirdLogo
                alt="my Wahou"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
            <span>my Wahou</span>
            <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Messagerie instantanée sécurisée sans forfaits texte & vocaux
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 p-1 mb-4 border border-zinc-200 dark:border-zinc-800 relative z-10">
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
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Créer un compte</span>
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
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Se connecter</span>
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
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {registerStep > 1 ? '✓' : '1'}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    registerStep === 1 ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  Compte Email
                </span>
              </div>

              <div className="h-0.5 w-8 bg-zinc-200 dark:bg-zinc-800 mx-2" />

              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    registerStep === 2
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/50'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  2
                </span>
                <span
                  className={`text-xs font-semibold ${
                    registerStep === 2 ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'
                  }`}
                >
                  Profil & Mot de passe
                </span>
              </div>
            </div>

            {/* STEP 1: EMAIL */}
            {registerStep === 1 && (
              <form onSubmit={handleProceedToNicknameStep} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Votre adresse email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-register-email-input"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="votre.email@exemple.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Votre email est lié à vos discussions. Vous définirez ensuite un mot de passe personnel pour protéger votre compte.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                <button
                  id="auth-register-step1-btn"
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Continuer : Profil et Mot de passe</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: NICKNAME, TAG & MANDATORY PASSWORD */}
            {registerStep === 2 && (
              <form onSubmit={handleFinalizeRegistration} className="space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep(1);
                      setErrorMessage('');
                    }}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Modifier l'email ({emailInput})</span>
                  </button>
                </div>

                {/* Surnom / Nom d'utilisateur */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 uppercase tracking-wide">
                    Surnom / Nom public <span className="text-pink-500 dark:text-pink-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
                    />
                  </div>
                </div>

                {/* Identifiant Unique de Profil */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                      Identifiant Unique de Profil <span className="text-pink-500 dark:text-pink-400">*</span>
                    </label>
                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono font-bold">
                      #NomTag@
                    </span>
                  </div>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-violet-500 dark:text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-register-profile-tag-input"
                      type="text"
                      required
                      value={profileTagInput}
                      onChange={(e) => setProfileTagInput(e.target.value)}
                      placeholder="Ex: #Spart20@ ou #Alex99@"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-violet-400 dark:border-violet-500/50 text-violet-700 dark:text-violet-200 font-mono text-sm focus:border-violet-500 dark:focus:border-violet-400 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition font-bold"
                    />
                  </div>
                </div>

                {/* NOUVEAU MOT DE PASSE (OBLIGATOIRE POUR NOUVEAUX COMPTES) */}
                <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Mot de passe du compte <span className="text-pink-500 dark:text-pink-400">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 lowercase">min. 4 car.</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-register-password-input"
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Créer un mot de passe sécurisé"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-emerald-500/40 text-zinc-900 dark:text-white text-sm focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 transition"
                      title={showRegisterPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CONFIRMER LE MOT DE PASSE */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 uppercase tracking-wide">
                    Confirmer le mot de passe <span className="text-pink-500 dark:text-pink-400">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-register-confirm-password-input"
                      type={showRegisterConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      placeholder="Confirmez votre mot de passe"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 transition"
                      title={showRegisterConfirmPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showRegisterConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span>Ce mot de passe protégera vos messages pour que personne d'autre ne puisse se connecter à votre place.</span>
                  </p>
                </div>

                {/* Photo de profil personnalisée */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                    Photo de Profil
                  </label>
                  <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
                    <UserAvatar
                      name={nicknameInput || 'Utilisateur'}
                      avatarUrl={customAvatarBase64}
                      size="md"
                    />

                    <div className="flex-1">
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
                          className="px-3 py-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>
                            {isProcessingPhoto
                              ? 'Chargement...'
                              : customAvatarBase64
                              ? 'Changer'
                              : 'Choisir photo'}
                          </span>
                        </button>

                        {customAvatarBase64 && (
                          <button
                            type="button"
                            onClick={() => setCustomAvatarBase64('')}
                            className="p-1 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
                            title="Supprimer la photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                <button
                  id="auth-register-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {loading ? 'Création et sécurisation...' : 'Créer mon compte sécurisé 🚀'}
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
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                Votre Adresse Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-login-email-input"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
                />
              </div>
            </div>

            {/* Status detection for the entered email */}
            {matchedLoginUser && (
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center gap-2.5 animate-fade-in">
                <UserAvatar
                  name={matchedLoginUser.displayName}
                  avatarUrl={matchedLoginUser.avatarUrl}
                  size="sm"
                  isVIP={matchedLoginUser.isVIP}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {matchedLoginUser.displayName}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {isMatchedUserConfigured ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Shield className="w-3 h-3 inline" /> Compte protégé par mot de passe
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 inline" /> Ancien compte : mot de passe à configurer
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Password input for users that have a password configured (or Admin) */}
            {(isMatchedUserConfigured ||
              emailInput.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>
                      {emailInput.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
                        ? 'Mot de passe Administrateur'
                        : 'Mot de passe de votre compte'}
                    </span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="auth-login-password-input"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPasswordInput}
                    onChange={(e) => setLoginPasswordInput(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-violet-500 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition p-1"
                    title={showLoginPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs font-medium space-y-2">
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
                    className="underline text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-white font-bold block"
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Vérification...'
                  : matchedLoginUser && !isMatchedUserConfigured
                  ? 'Continuer et Configurer mon mot de passe 🔒'
                  : 'Se connecter à my Wahou'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Developer Credit Footer */}
        <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-900/80 text-center relative z-10">
          <p className="text-xs font-semibold text-zinc-500">
            ⚡ <span className="text-violet-600 dark:text-violet-400">développer part wastus spart 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
