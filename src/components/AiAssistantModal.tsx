import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, HelpCircle, Shield, Phone, Radio, Users, Lock, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';
import { playUiTapSound, playMessageClickSound } from '../utils/soundUtils';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

interface AssistantQandA {
  q: string;
  a: string;
  category: string;
}

const PRESET_FAQS: AssistantQandA[] = [
  {
    category: 'Discussions',
    q: 'Comment épingler ou gérer une discussion ?',
    a: "Dans l'espace Discussions, faites un appui long sur n'importe quelle conversation pour afficher les 6 options : Épingler en tête ⭐ (jusqu'à 3 conversations), Supprimer la discussion 🗑️, Archiver 📁, Ajouter aux favoris ❤️, Vider les messages 🧹, ou Lancer un appel direct 📞."
  },
  {
    category: 'Groupes',
    q: 'Comment fonctionnent les groupes Lisanga ?',
    a: "Lorsque vous créez un groupe Lisanga, il est 100% privé et visible uniquement par les membres que vous invitez ou ajoutez directement. En tant que créateur et administrateur principal, vous pouvez ajouter d'autres administrateurs, exclure des membres, ou fermer la discussion aux non-administrateurs."
  },
  {
    category: 'Appels',
    q: 'Comment passer un appel vocal ou vidéo ?',
    a: "Ouvrez une discussion avec votre contact. Vous trouverez directement le bouton d'appel normal 📞 dans la barre du haut. Pour un appel vidéo HD, cliquez sur les 3 points verticaux ⋮ à droite et choisissez 'Appel vidéo'."
  },
  {
    category: 'Personnalisation',
    q: 'Comment changer le fond ou donner un surnom ?',
    a: "Dans une discussion, cliquez sur les 3 points verticaux ⋮ à droite. Vous pourrez personnaliser le fond d'écran (avec vos photos ou de magnifiques couleurs) et définir un 'Surnom' unique pour votre contact qui ne sera visible que par vous."
  },
  {
    category: 'Sécurité',
    q: 'Comment sécuriser mon compte avec un mot de passe ?',
    a: "Rendez-vous dans votre espace Profil, puis cliquez sur 'Sécurité & Mot de passe'. Vous pouvez définir un mot de passe sécurisé à tout moment pour verrouiller l'accès à vos conversations."
  },
  {
    category: 'Bulle Assistive',
    q: 'Comment déplacer la bulle de discussion flottante ?',
    a: "La bulle flottante fonctionne comme la touche tactile virtuelle sur iPhone : vous pouvez la faire glisser à n'importe quel endroit de votre écran. Au repos, elle reste discrète à 42% d'opacité pour ne pas masquer votre contenu."
  }
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `Bonjour ${currentUser.displayName} ! Je suis votre Assistant IA my Wahou. Comment puis-je vous aider aujourd'hui ? Choisissez une question rapide ci-dessous ou écrivez votre demande.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSendQuestion = (questionText: string) => {
    if (!questionText.trim()) return;
    playUiTapSound();

    const userMsg = {
      sender: 'user' as const,
      text: questionText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Simulate intelligent response tailored to my Wahou features
    setTimeout(() => {
      let reply = "Je suis là pour vous accompagner. Vous pouvez utiliser la barre de retour rapide en bas de l'écran pour revenir à vos discussions à tout moment, ou faire un appui long sur une conversation pour accéder aux 6 actions rapides (étoile, favoris, suppression, etc.).";

      const lower = questionText.toLowerCase();
      if (lower.includes('épingler') || lower.includes('etoile') || lower.includes('étoile') || lower.includes('3')) {
        reply = "Pour épingler une discussion en tête, faites un appui long sur celle-ci dans la liste des discussions et touchez l'icône ⭐ Étoile. Vous pouvez maintenir jusqu'à 3 conversations toujours épinglées en tête !";
      } else if (lower.includes('groupe') || lower.includes('lisanga') || lower.includes('admin')) {
        reply = "Vos groupes créés sont 100% confidentiels : seuls les membres que vous avez invités ou ajoutés peuvent les voir. Vous avez le pouvoir d'ajouter d'autres administrateurs, de gérer les membres et de fermer l'envoi de messages aux non-administrateurs.";
      } else if (lower.includes('fond') || lower.includes('couleur') || lower.includes('photo') || lower.includes('surnom')) {
        reply = "Pour changer le fond d'écran d'une discussion ou donner un surnom privé à un contact, ouvrez la conversation, touchez les 3 points ⋮ en haut à droite, puis sélectionnez 'Fond d'écran' ou 'Modifier le surnom'.";
      } else if (lower.includes('appel') || lower.includes('video') || lower.includes('vidéo') || lower.includes('sonnerie')) {
        reply = "Les appels audio normaux se lancent directement avec le bouton 📞 dans l'en-tête de la discussion. Pour un appel vidéo, touchez les 3 points ⋮ puis 'Appel vidéo'. La sonnerie est automatiquement diffusée !";
      } else if (lower.includes('supprimer') || lower.includes('vider') || lower.includes('effacer')) {
        reply = "En faisant un appui long sur une discussion : vous avez le choix entre l'Option 2 (Supprimer la discussion et tous les messages) et l'Option 5 (Vider uniquement les messages à l'intérieur en conservant la discussion).";
      } else if (lower.includes('mot de passe') || lower.includes('sécurité') || lower.includes('compte')) {
        reply = "Votre compte peut être sécurisé par mot de passe depuis l'espace Profil > Sécurité & Mot de passe. Dès qu'il est configuré, il protège tous vos accès.";
      }

      playMessageClickSound();
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg h-[600px] max-h-[92vh] bg-zinc-950 border border-violet-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-violet-950/80 via-zinc-900 to-pink-950/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Assistant IA my Wahou</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Actif
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Aide simple et accompagnement des utilisateurs</p>
            </div>
          </div>
          <button
            onClick={() => {
              playUiTapSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick FAQ Chips */}
        <div className="p-3 bg-zinc-900/60 border-b border-white/5 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
          {PRESET_FAQS.map((faq, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuestion(faq.q)}
              className="text-[11px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white border border-white/10 whitespace-nowrap transition flex items-center gap-1 shrink-0"
            >
              <HelpCircle className="w-3 h-3 text-cyan-400" />
              <span>{faq.q}</span>
            </button>
          ))}
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-950/40">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-br-sm'
                    : 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-bl-sm shadow'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[9px] text-zinc-500 mt-1 px-1">{m.time}</span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 w-20">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuestion(inputVal);
          }}
          className="p-3 bg-zinc-900/90 border-t border-white/10 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Posez votre question à l'Assistant IA..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition flex items-center justify-center shadow-md shadow-violet-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
