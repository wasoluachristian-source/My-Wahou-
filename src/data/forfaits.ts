import { ForfaitPlan } from '../types';

export const FORFAIT_PLANS: ForfaitPlan[] = [
  {
    id: 'plan_starter_media',
    name: 'Pass Médias Flash',
    tagline: 'Pour partager vos meilleurs souvenirs en photos & vidéos HD',
    price: '1.99 €',
    priceValue: 1.99,
    mediaUnits: 25,
    callMinutes: 0,
    isUnlimitedMedia: false,
    isUnlimitedCalls: false,
    isVIP: false,
    validityDays: 30,
    badgeColor: 'bg-emerald-500 text-white',
    features: [
      '25 envois de Photos et Vidéos HD',
      'Compression ultra-rapide sans perte',
      'Messages texte & vocaux toujours 100% gratuits',
      'Validité 30 jours'
    ]
  },
  {
    id: 'plan_call_boost',
    name: 'Pass Wahou Appels 60 Min',
    tagline: 'Passez des appels vocaux et vidéo haute définition',
    price: '2.99 €',
    priceValue: 2.99,
    mediaUnits: 5,
    callMinutes: 60,
    isUnlimitedMedia: false,
    isUnlimitedCalls: false,
    isVIP: false,
    validityDays: 30,
    badgeColor: 'bg-blue-600 text-white',
    features: [
      '60 Minutes d’appels Voix & Vidéo HD',
      '5 Photos/Vidéos offertes',
      'Qualité audio cristalline',
      'Connexion prioritaire sécurisée'
    ]
  },
  {
    id: 'plan_vip_unlimited',
    name: 'Pass Wahou VIP Illimité',
    tagline: 'La liberté absolue : Médias et Appels illimités',
    price: '7.99 €',
    priceValue: 7.99,
    mediaUnits: 9999,
    callMinutes: 9999,
    isUnlimitedMedia: true,
    isUnlimitedCalls: true,
    isVIP: true,
    validityDays: 30,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20',
    popular: true,
    features: [
      '👑 Badge VIP doré sur votre profil',
      '📸 Envois Photos & Vidéos ILLIMITÉS',
      '📞 Appels Voix & Vidéo ILLIMITÉS',
      '⚡ Vitesse d’envoi prioritaire',
      '💬 Notes vocales & textes 100% gratuits'
    ]
  }
];
