import { useState } from 'react';
import {
  Smartphone,
  Apple,
  Download,
  Share,
  PlusSquare,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { AppSettings } from '../types';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
}

export function AppInstallModal({
  isOpen,
  onClose,
  appSettings,
}: AppInstallModalProps) {
  const [activeTab, setActiveTab] = useState<'iphone' | 'android'>('iphone');
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      id="app-install-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-white"
    >
      <div
        id="app-install-container"
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Installer l'Application Mobile
              </h2>
              <p className="text-xs text-zinc-400">
                Sur iPhone (iOS) & Téléphone Android
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: iPhone vs Android */}
        <div className="my-5 flex rounded-2xl bg-zinc-900 p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab('iphone')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'iphone'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>Sur iPhone (Safari)</span>
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'android'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Sur Android / Chrome</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: IPHONE (SAFARI) INSTALL GUIDE */}
        {/* ==================================================== */}
        {activeTab === 'iphone' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-500/30 text-xs text-violet-200">
              📲 <strong>Sur votre iPhone</strong>, vous pouvez ajouter l'icône de {appSettings.appName || 'my Wahou'} directement sur votre bureau d'accueil en 3 étapes simples :
            </div>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0 text-sm">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Ouvrez le menu Partager de Safari</span>
                    <Share className="w-4 h-4 text-blue-400 inline" />
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Dans Safari sur votre iPhone, appuyez sur le bouton de partage (le carré bleu avec la flèche vers le haut <strong className="text-white">⬆️</strong> situé en bas de l'écran).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0 text-sm">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Choisissez « Sur l'écran d'accueil »</span>
                    <PlusSquare className="w-4 h-4 text-emerald-400 inline" />
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Faites défiler la liste vers le bas et touchez l'option <strong>« Sur l'écran d'accueil »</strong> (icône <strong className="text-white">[+]</strong>).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/30 text-violet-400 font-bold flex items-center justify-center shrink-0 text-sm">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Touchez « Ajouter » en haut à droite
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    L'icône officielle <strong>{appSettings.appName || 'my Wahou'}</strong> apparaît instantanément sur le menu de votre iPhone comme une vraie application !
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: ANDROID / CHROME INSTALL GUIDE */}
        {/* ==================================================== */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
              🤖 <strong>Sur votre téléphone Android</strong>, installez l'application en plein écran avec notifications en quelques secondes :
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-sm">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Ouvrez les options de Google Chrome (3 points verticaux ⋮)
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Appuyez sur les 3 petits points situés en haut à droite de votre navigateur Chrome.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-sm">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Touchez « Installer l'application »</span>
                    <Download className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Cliquez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copy Link Section */}
        <div className="mt-5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
          <div className="truncate text-xs">
            <span className="text-zinc-400 block text-[10px]">Lien direct de l'application :</span>
            <span className="font-mono text-violet-300 truncate">{currentUrl}</span>
          </div>
          <button
            onClick={handleCopyUrl}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shrink-0 transition"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Copier'}
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-zinc-800 text-center">
          <p className="text-[11px] font-semibold text-zinc-500">
            ⚡ <span className="text-violet-400">développer part wastus spart 2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
