import { useState } from 'react';
import {
  Smartphone,
  Apple,
  Download,
  Share,
  PlusSquare,
  Check,
  Sparkles,
  ShieldCheck,
  Globe,
  Radio,
  ExternalLink
} from 'lucide-react';
import { AppSettings } from '../types';

interface MobileAppViewProps {
  appSettings: AppSettings;
}

export function MobileAppView({ appSettings }: MobileAppViewProps) {
  const [activeTab, setActiveTab] = useState<'iphone' | 'android'>('iphone');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const currentUrl = window.location.href;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      id="mobile-app-space-container"
      className="flex-1 h-full bg-zinc-950 flex flex-col overflow-y-auto select-none p-4 sm:p-8"
    >
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-violet-600/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Espace Application Mobile & iPhone
              </h2>
              <p className="text-xs text-zinc-400">
                Installez l'icône {appSettings.appName || 'my Wahou'} sur votre écran d'accueil
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-2xl bg-zinc-900 p-1.5 border border-zinc-800">
          <button
            onClick={() => setActiveTab('iphone')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'iphone'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Apple className="w-5 h-5" />
            <span>Sur iPhone (Safari iOS)</span>
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'android'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Sur Téléphone Android / Chrome</span>
          </button>
        </div>

        {/* TAB 1: IPHONE INSTRUCTIONS */}
        {activeTab === 'iphone' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-violet-950/40 border border-violet-500/30 text-sm text-violet-200 leading-relaxed">
              📲 <strong>Guide d'installation sur iPhone (Safari) :</strong>
              <br />
              Vous pouvez ajouter l'application sur le bureau de votre iPhone comme une vraie application native en 3 clics simples :
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-violet-600/30 text-violet-300 font-black flex items-center justify-center shrink-0 text-base shadow-md">
                  1
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Appuyez sur l'icône Partager de Safari</span>
                    <Share className="w-4 h-4 text-blue-400" />
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Dans votre navigateur Safari sur iPhone, appuyez sur le bouton de partage au centre en bas (carré avec la flèche vers le haut <strong className="text-white">⬆️</strong>).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-violet-600/30 text-violet-300 font-black flex items-center justify-center shrink-0 text-base shadow-md">
                  2
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Touchez « Sur l'écran d'accueil »</span>
                    <PlusSquare className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Faites défiler le menu d'actions vers le bas et appuyez sur la ligne <strong>« Sur l'écran d'accueil »</strong> (icône avec le signe <strong className="text-white">[+]</strong>).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-violet-600/30 text-violet-300 font-black flex items-center justify-center shrink-0 text-base shadow-md">
                  3
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Touchez « Ajouter » en haut à droite</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    L'icône officielle <strong>{appSettings.appName || 'my Wahou'}</strong> s'installe immédiatement sur votre bureau d'iPhone. Vous pouvez la lancer en 1 clic en plein écran !
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANDROID INSTRUCTIONS */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-emerald-950/40 border border-emerald-500/30 text-sm text-emerald-200 leading-relaxed">
              🤖 <strong>Guide d'installation sur Android (Google Chrome) :</strong>
              <br />
              Profitez de l'expérience plein écran avec audio HD et notifications instantanées :
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 text-emerald-300 font-black flex items-center justify-center shrink-0 text-base shadow-md">
                  1
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Ouvrez le menu Chrome (3 points verticaux ⋮)
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Appuyez sur les 3 points verticaux en haut à droite de Chrome sur votre téléphone.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 text-emerald-300 font-black flex items-center justify-center shrink-0 text-base shadow-md">
                  2
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Cliquez sur « Installer l'application »</span>
                    <Download className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong> pour installer l'icône sur votre téléphone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Copy Box */}
        <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="truncate text-xs text-center sm:text-left">
            <span className="text-zinc-400 block text-[11px] mb-0.5">Lien universel de l'application :</span>
            <span className="font-mono text-violet-300 truncate font-semibold">{currentUrl}</span>
          </div>

          <button
            onClick={handleCopyUrl}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shrink-0 transition flex items-center gap-1.5 shadow-md"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : null}
            <span>{copiedUrl ? 'Lien copié !' : 'Copier le lien'}</span>
          </button>
        </div>

        {/* Developer signature */}
        <div className="pt-4 border-t border-zinc-900 text-center">
          <p className="text-xs font-semibold text-zinc-500">
            ⚡ <span className="text-violet-400">développer part wastus spart 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
