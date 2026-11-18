import { useState, FormEvent } from 'react';
import { Shield, KeyRound, Eye, EyeOff, CheckCircle2, Lock, X, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';
import { setUserPasswordInDb } from '../services/dbService';
import { hashPassword } from '../utils/securityUtils';
import { UserAvatar } from './UserAvatar';
import { playUiTapSound } from '../utils/soundUtils';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  user: UserProfile;
  onPasswordSet: (updatedUser: UserProfile) => void;
  isMandatory?: boolean;
  title?: string;
  description?: string;
}

export function SetPasswordModal({
  isOpen,
  onClose,
  user,
  onPasswordSet,
  isMandatory = false,
  title = 'Configurer votre mot de passe',
  description = 'Sécurisez définitivement votre compte pour empêcher quiconque d’accéder à vos discussions.',
}: SetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmed || trimmed.length < 4) {
      setErrorMessage('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    if (trimmed !== trimmedConfirm) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    playUiTapSound();

    try {
      const hashed = await hashPassword(trimmed);
      await setUserPasswordInDb(user.id, hashed);

      const updatedUser: UserProfile = {
        ...user,
        passwordHash: hashed,
        hasPassword: true,
      };

      setSuccess(true);
      setTimeout(() => {
        onPasswordSet(updatedUser);
      }, 700);
    } catch (err) {
      console.error('Erreur lors de l’enregistrement du mot de passe:', err);
      setErrorMessage('Impossible d’enregistrer le mot de passe. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div
      id="set-password-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="set-password-modal-container"
        className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-zinc-900 dark:text-white shadow-2xl overflow-y-auto max-h-[92dvh] my-auto"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-600/15 dark:bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-violet-600/15 dark:bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button if not mandatory */}
        {!isMandatory && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition z-20"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="text-center mb-5 relative z-10">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg shadow-emerald-600/30 mb-3 animate-pulse">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
            <span>{title}</span>
            <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Identified User Badge */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center gap-3 mb-5 relative z-10">
          <UserAvatar
            name={user.displayName}
            avatarUrl={user.avatarUrl}
            size="md"
            isVIP={user.isVIP}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                {user.displayName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                Compte existant
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 mb-5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200/90 relative z-10 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            Une fois votre mot de passe enregistré, <strong>vous seul</strong> pourrez vous connecter à votre compte. Toute tentative sans ce mot de passe sera bloquée.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Nouveau Mot de Passe */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide flex items-center justify-between">
              <span>Votre nouveau mot de passe</span>
              <span className="text-[10px] text-zinc-500 lowercase">min. 4 caractères</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="set-new-password-input"
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Entrez votre nouveau mot de passe"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-emerald-500 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition p-1"
                title={showNewPassword ? 'Masquer' : 'Afficher'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmer le Mot de Passe */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="set-confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez votre mot de passe pour confirmer"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm focus:border-emerald-500 focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition p-1"
                title={showConfirmPassword ? 'Masquer' : 'Afficher'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs font-medium animate-shake">
              {errorMessage}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Mot de passe enregistré avec succès ! Connexion sécurisée...</span>
            </div>
          )}

          <button
            id="set-password-submit-btn"
            type="submit"
            disabled={loading || success}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {loading ? 'Sécurisation en cours...' : success ? 'Compte sécurisé !' : 'Enregistrer mon mot de passe et continuer 🔒'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
