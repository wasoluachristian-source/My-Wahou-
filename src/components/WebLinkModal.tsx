import { useState } from 'react';
import { Share2, Copy, Check, X, ExternalLink, MessageCircle, Send, Globe } from 'lucide-react';

interface WebLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
}

export function WebLinkModal({ isOpen, onClose, appName }: WebLinkModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Compute the current web page URL
  const appWebUrl = typeof window !== 'undefined' ? window.location.href : 'https://mywahou.app';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(appWebUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${appName} - Application & Messagerie Directe`,
          text: `Rejoins-moi sur ${appName} ! Messagerie texte et vocale 100% gratuite, forfaits médias et appels HD. Développé par wastus spart 2026.`,
          url: appWebUrl,
        });
      } catch (err) {
        console.log('Share canceled or error', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Rejoins-moi sur ${appName} pour discuter gratuitement en texte et vocal ! Ouvre l'application ou le lien ici : ${appWebUrl}\n(Développé par wastus spart 2026)`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareOnTelegram = () => {
    const text = encodeURIComponent(`Rejoins-moi sur l'application ${appName} ! ${appWebUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(appWebUrl)}&text=${text}`, '_blank');
  };

  return (
    <div
      id="weblink-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-zinc-100"
    >
      <div
        id="weblink-modal-container"
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Partage de l'Application
              </h2>
              <p className="text-xs text-zinc-400">
                Envoyer le lien d'accès à vos amis et contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5 relative z-10">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Partagez le lien de l'application pour permettre à vos correspondants de se connecter immédiatement depuis n'importe quel appareil (navigateur web, mobile ou ordinateur) et de communiquer gratuitement.
          </p>

          {/* Link Box */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Lien direct de l'application :
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-violet-300 truncate select-all">
                {appWebUrl}
              </div>
              <button
                id="copy-web-link-btn"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Lien Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2.5">
              Partager en 1 Clic :
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={shareOnWhatsApp}
                className="p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={shareOnTelegram}
                className="p-3 rounded-2xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="p-3 rounded-2xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/30 text-violet-300 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Partager via...</span>
              </button>
            </div>
          </div>

          {/* Information box */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
            <div className="flex items-center gap-2 text-violet-300 font-bold">
              <Globe className="w-4 h-4" />
              <span>Accès direct sans téléchargement préalable</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Les nouveaux utilisateurs s'inscrivent avec leur adresse email, définissent leur profil et profitent immédiatement des messages textes & vocaux gratuits.
            </p>
          </div>

          {/* Official Developer Signature Mention */}
          <div className="pt-3 border-t border-zinc-800 text-center">
            <p className="text-xs font-semibold text-zinc-400">
              ⚡ <span className="text-violet-400">développer part wastus spart 2026</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Plateforme certifiée my Wahou • Version 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
