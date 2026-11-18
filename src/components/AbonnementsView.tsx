import { useState } from 'react';
import {
  Crown,
  Zap,
  Image as ImageIcon,
  PhoneCall,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Flame,
  Clock,
  Coins
} from 'lucide-react';
import { UserProfile } from '../types';

interface AbonnementsViewProps {
  currentUser: UserProfile;
  onOpenForfaitModal: (type?: 'media' | 'call' | 'vip') => void;
}

export function AbonnementsView({
  currentUser,
  onOpenForfaitModal,
}: AbonnementsViewProps) {
  return (
    <div
      id="abonnements-space-container"
      className="flex-1 h-full bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-y-auto select-none p-4 sm:p-8 text-zinc-900 dark:text-white"
    >
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-pink-600 flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/25">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Espace Mes Abonnements & Forfaits</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gérez vos quotas de médias, minutes d'appels et accès VIP
              </p>
            </div>
          </div>

          <button
            id="recharge-forfait-header-btn"
            onClick={() => onOpenForfaitModal('vip')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:opacity-95 transition"
          >
            ⭐ Recharger mes Forfaits
          </button>
        </div>

        {/* Current Balance Overview Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Mon Statut Actuel
            </h3>
            {currentUser.isVIP ? (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> MEMBRE VIP ILLIMITÉ
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold">
                Standard Gratuit
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Free Messaging */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">Messages & Vocaux</span>
                <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">100% Gratuit</div>
              <p className="text-[11px] text-zinc-500 mt-1">Illimité et sans aucun forfait requis</p>
            </div>

            {/* Media Quota */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">Crédits Médias (Photos/Vidéos)</span>
                <ImageIcon className="w-4 h-4 text-pink-500 dark:text-pink-400" />
              </div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">
                {currentUser.isVIP ? 'Illimité' : `${currentUser.mediaQuota || 0} photos/vidéos`}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Pour envoyer des fichiers dans les discussions</p>
            </div>

            {/* Call Quota */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold">Appels Audio & Vidéo HD</span>
                <PhoneCall className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">
                {currentUser.isVIP ? 'Illimité' : `${currentUser.callMinutes || 0} minutes`}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Communications chiffrées WebRTC</p>
            </div>
          </div>
        </div>

        {/* Available Forfait Plans */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Nos Formules d'Abonnement
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* VIP Plan */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-50 via-white to-white dark:from-amber-950/40 dark:via-zinc-900 dark:to-zinc-950 border-2 border-amber-500/50 flex flex-col justify-between relative shadow-xl shadow-amber-500/10">
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] uppercase">
                Populaire
              </div>

              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-3">
                  <Crown className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white">Pass VIP Illimité</h4>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 my-2">
                  10,00 $ <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">/ mois</span>
                </div>
                <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-2 mt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Photos & Vidéos illimitées</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Appels audio & vidéo illimités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Journée Live illimitée (Photos & Vidéos)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Badge Couronne VIP Dorée</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenForfaitModal('vip')}
                className="mt-6 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition shadow-md"
              >
                Activer le Pass VIP
              </button>
            </div>

            {/* Media Pack */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-3">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white">Pack Médias</h4>
                <div className="text-2xl font-black text-pink-600 dark:text-pink-400 my-2">
                  2,00 $ <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">/ recharge</span>
                </div>
                <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-2 mt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 dark:text-pink-400 shrink-0" />
                    <span>+20 Photos / Vidéos HD</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 dark:text-pink-400 shrink-0" />
                    <span>Valable sans limite de durée</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 dark:text-pink-400 shrink-0" />
                    <span>Partage dans tous les chats</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenForfaitModal('media')}
                className="mt-6 w-full py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs transition"
              >
                Prendre le Pack Médias
              </button>
            </div>

            {/* Call Pack */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white">Pack Appels HD</h4>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 my-2">
                  3,00 $ <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">/ recharge</span>
                </div>
                <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-2 mt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span>+60 Minutes d'appels vidéo & voix</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span>Son cristallin HD et vidéo fluide</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span>Sans engagement</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenForfaitModal('call')}
                className="mt-6 w-full py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs transition"
              >
                Prendre le Pack Appels
              </button>
            </div>
          </div>
        </div>

        {/* Developer signature */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900 text-center">
          <p className="text-xs font-semibold text-zinc-500">
            ⚡ <span className="text-violet-600 dark:text-violet-400">développé par Wastus Spart 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
