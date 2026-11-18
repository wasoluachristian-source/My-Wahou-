import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Zap, Check, Image, PhoneCall, Crown, ShieldCheck, X } from 'lucide-react';
import { FORFAIT_PLANS } from '../data/forfaits';
import { UserProfile, ForfaitPlan } from '../types';
import { updateUserInDb } from '../services/dbService';

interface ForfaitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onForfaitActivated?: (updatedUser: UserProfile) => void;
  initialSelectedType?: 'media' | 'call' | 'vip';
}

export function ForfaitModal({
  isOpen,
  onClose,
  currentUser,
  onForfaitActivated,
  initialSelectedType = 'vip'
}: ForfaitModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    if (initialSelectedType === 'media') return 'plan_starter_media';
    if (initialSelectedType === 'call') return 'plan_call_boost';
    return 'plan_vip_unlimited';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activatedPlanName, setActivatedPlanName] = useState('');

  if (!isOpen) return null;

  const handlePurchase = async (plan: ForfaitPlan) => {
    setIsProcessing(true);
    try {
      // Simulate rapid secure checkout
      await new Promise(resolve => setTimeout(resolve, 800));

      const newMediaQuota = plan.isUnlimitedMedia ? 9999 : (currentUser.mediaQuota || 0) + plan.mediaUnits;
      const newCallMinutes = plan.isUnlimitedCalls ? 9999 : (currentUser.callMinutes || 0) + plan.callMinutes;
      const isVIP = plan.isVIP || currentUser.isVIP;

      const updates: Partial<UserProfile> = {
        mediaQuota: newMediaQuota,
        callMinutes: newCallMinutes,
        isVIP: isVIP,
        vipExpiresAt: isVIP ? Date.now() + plan.validityDays * 86400000 : currentUser.vipExpiresAt,
      };

      await updateUserInDb(currentUser.id, updates);

      // Trigger Confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      setActivatedPlanName(plan.name);
      setPaymentSuccess(true);

      if (onForfaitActivated) {
        onForfaitActivated({ ...currentUser, ...updates });
      }

      setTimeout(() => {
        setPaymentSuccess(false);
        setIsProcessing(false);
        onClose();
      }, 2200);

    } catch (err) {
      console.error('Error activating forfait:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="forfait-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div
        id="forfait-modal-container"
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-zinc-900 dark:text-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-violet-600/15 dark:bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-pink-600/10 dark:bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80 relative z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 text-white shadow-md">
                <Zap className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:bg-gradient-to-r dark:from-white dark:via-zinc-100 dark:to-zinc-400 dark:bg-clip-text dark:text-transparent">
                Boutique de Forfaits my Wahou
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Rechargez vos crédits Photos, Vidéos HD et Appels voix/vidéo.
            </p>
          </div>
          <button
            id="close-forfait-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free message notice banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-3 relative z-10 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold text-base">
            🎁
          </div>
          <div className="text-xs sm:text-sm">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">Rappel gratuité my Wahou :</span>
            <p className="text-emerald-800/80 dark:text-emerald-200/80">
              Tous vos <strong>messages textes</strong> et <strong>messages vocaux</strong> sont 100% gratuits et sans forfait !
            </p>
          </div>
        </div>

        {/* Current Balances */}
        <div className="my-4 grid grid-cols-2 gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/40 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/15 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Solde Médias (Photos/Vidéos)</p>
              <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                {currentUser.isVIP ? 'Illimité 👑' : `${currentUser.mediaQuota || 0} crédits`}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/40 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Solde Appels Voix/Vidéo</p>
              <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                {currentUser.isVIP ? 'Illimité 👑' : `${currentUser.callMinutes || 0} min`}
              </p>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="overflow-y-auto pr-1 space-y-3 flex-1">
          {paymentSuccess ? (
            <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-500/40 rounded-3xl my-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">Forfait Activé avec Succès !</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-200">
                Votre <strong>{activatedPlanName}</strong> est immédiatement actif sur votre compte my Wahou.
              </p>
            </div>
          ) : (
            FORFAIT_PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  id={`forfait-card-${plan.id}`}
                  className={`relative p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                    isSelected
                      ? 'bg-violet-50/70 dark:bg-zinc-800/90 border-violet-500 ring-2 ring-violet-500/40 shadow-xl'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-4 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Recommandé
                    </span>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${plan.isVIP ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-violet-500/20 text-violet-600 dark:text-violet-400'}`}>
                        {plan.isVIP ? <Crown className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-base flex items-center gap-2">
                          {plan.name}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{plan.tagline}</p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between">
                      <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">{plan.price}</span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">pour {plan.validityDays} jours</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-700/40 text-xs text-zinc-700 dark:text-zinc-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Quick Select / Action button */}
                  <div className="mt-3.5 pt-2 flex justify-end">
                    <button
                      id={`buy-plan-btn-${plan.id}`}
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(plan);
                      }}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
                        plan.isVIP
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-amber-500/25'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/25'
                      }`}
                    >
                      {isProcessing ? (
                        <span className="inline-block animate-spin">🌀 Activation...</span>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Activer ce Forfait ({plan.price})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center text-[11px] text-zinc-500 shrink-0">
          Paiement sécurisé instantané • Forfaits cumulables • Activation automatique
        </div>
      </div>
    </div>
  );
}
