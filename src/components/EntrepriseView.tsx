import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Building2,
  Sparkles,
  Send,
  Radio,
  ExternalLink,
  Shield,
  CheckCircle2,
  Clock,
  Check,
  X,
  Upload,
  Layers,
  Phone,
  Mail,
  Zap,
  Globe,
  Tag,
  AlertCircle,
  Eye,
  MousePointerClick,
  Trash2,
  Briefcase
} from 'lucide-react';
import { UserProfile, BusinessAd, AppSettings } from '../types';
import {
  isUserAdmin,
  subscribeBusinessAds,
  submitBusinessAdToDb,
  updateBusinessAdStatusInDb,
  deleteBusinessAdFromDb,
  postAdToJourneeLive
} from '../services/dbService';
import { compressImageFile } from '../utils/mediaUtils';
import { BrandBirdLogo } from './BrandBirdLogo';

interface EntrepriseViewProps {
  currentUser: UserProfile;
  appSettings: AppSettings;
  onOpenJourneeLive?: () => void;
}

export function EntrepriseView({ currentUser, appSettings, onOpenJourneeLive }: EntrepriseViewProps) {
  const isAdmin = isUserAdmin(currentUser);
  const [ads, setAds] = useState<BusinessAd[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'submit' | 'admin_manage'>('explore');

  // Form state for submitting a new business ad / partnership
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState(currentUser.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [category, setCategory] = useState('Commerce & Boutique');
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [sponsorTag, setSponsorTag] = useState('OFFRE PARTENAIRE');
  const [budgetPlan, setBudgetPlan] = useState('24h Live Sponsorisé');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [previewAd, setPreviewAd] = useState<BusinessAd | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeBusinessAds((data) => {
      setAds(data);
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 800, 800, 0.85);
        setMediaUrl(compressed);
        setMediaType('image');
      } catch (err) {
        console.error('Failed to compress ad image', err);
      }
    } else if (file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMediaUrl(reader.result);
          setMediaType('video');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAd = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !adTitle.trim() || !adDescription.trim()) {
      alert('Veuillez remplir le nom de votre entreprise, le titre et la description.');
      return;
    }

    setIsSubmitting(true);
    const newAd: BusinessAd = {
      id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      companyName: companyName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      category,
      title: adTitle.trim(),
      description: adDescription.trim(),
      mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      mediaType,
      targetUrl: targetUrl.trim() || undefined,
      sponsorTag: sponsorTag.trim() || 'SPONSORISÉ',
      budgetPlan,
      status: isAdmin ? 'approved' : 'pending',
      submittedBy: currentUser.id,
      submittedAt: Date.now(),
      approvedAt: isAdmin ? Date.now() : undefined,
      stats: { views: 0, clicks: 0 }
    };

    try {
      await submitBusinessAdToDb(newAd);
      setSubmitSuccess(true);
      setIsSubmitting(false);

      // Reset form
      setCompanyName('');
      setAdTitle('');
      setAdDescription('');
      setTargetUrl('');
      setMediaUrl('');

      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab(isAdmin ? 'admin_manage' : 'explore');
      }, 2500);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handlePostToLive = async (ad: BusinessAd) => {
    try {
      await postAdToJourneeLive(ad, currentUser);
      setActionSuccessMsg(`✅ La publicité "${ad.companyName}" a été diffusée sur Journée Live avec succès !`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to post ad to live', err);
    }
  };

  const handleStatusChange = async (adId: string, status: 'approved' | 'rejected') => {
    await updateBusinessAdStatusInDb(adId, status);
  };

  const handleDeleteAd = async (adId: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette annonce ?')) {
      await deleteBusinessAdFromDb(adId);
    }
  };

  const approvedAds = ads.filter(a => a.status === 'approved' || a.status === 'posted_live');
  const pendingAds = ads.filter(a => a.status === 'pending');

  return (
    <div className="flex-1 h-full bg-slate-50 dark:bg-zinc-950 flex flex-col overflow-y-auto custom-scrollbar transition-colors">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-100/90 via-purple-50 to-white dark:from-violet-950/80 dark:via-purple-900/60 dark:to-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Building2 className="w-4 h-4" />
              <span>Espace Entreprises & Publicités</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
              Collaborez & Boostez votre Visibilité sur {appSettings.appName || 'my Wahou'}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-300 text-sm mt-2 max-w-2xl leading-relaxed">
              Proposez vos produits, services et offres promotionnelles. L'administrateur valide et diffuse vos publicités directement sur <strong>Journée Live</strong> pour toucher tous les utilisateurs actifs !
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('submit')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-violet-600/30 transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Déposer une Publicité</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto flex items-center gap-2 mt-8 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'explore'
                ? 'bg-violet-600 text-white shadow'
                : 'bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Partenaires & Annonces ({approvedAds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'submit'
                ? 'bg-violet-600 text-white shadow'
                : 'bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Nouvelle Campagne</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin_manage')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'admin_manage'
                  ? 'bg-amber-500 text-zinc-950 shadow-lg font-black'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Gestion Admin Pubs ({ads.length})</span>
              {pendingAds.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
                  {pendingAds.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Global alert notifications */}
      {actionSuccessMsg && (
        <div className="max-w-5xl mx-auto w-full px-6 pt-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* TAB 1: EXPLORE PARTNERS & ACTIVE ADS */}
      {activeTab === 'explore' && (
        <div className="max-w-5xl mx-auto w-full p-6 md:p-8 space-y-8">
          {/* Key Advantages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 shadow-sm dark:shadow-none">
              <div className="w-10 h-10 rounded-xl bg-violet-600/15 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                <Radio className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">Diffusion Journée Live</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Vos visuels et vidéos sont projetés au format immersif 24H sur le fil d'actualité vidéo de tous les utilisateurs.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 shadow-sm dark:shadow-none">
              <div className="w-10 h-10 rounded-xl bg-pink-600/15 dark:bg-pink-600/20 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-3">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">Redirection Clic Direct</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Lien interactif direct vers votre numéro WhatsApp, votre boutique ou votre site officiel sans intermédiaire.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 shadow-sm dark:shadow-none">
              <div className="w-10 h-10 rounded-xl bg-amber-600/15 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">Badge Partenaire Officiel</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Gagnez la confiance de la communauté grâce aux certifications de marque sponsorisée my Wahou.
              </p>
            </div>
          </div>

          {/* Active Campaigns Gallery */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Publicités & Entreprises Partenaires</span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">({approvedAds.length})</span>
              </h3>

              {onOpenJourneeLive && (
                <button
                  onClick={onOpenJourneeLive}
                  className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:text-pink-500 dark:hover:text-pink-300 flex items-center gap-1.5"
                >
                  <Radio className="w-4 h-4" />
                  <span>Voir en direct sur Journée Live</span>
                </button>
              )}
            </div>

            {approvedAds.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-sm dark:shadow-none">
                <Building2 className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1">Aucune publicité pour le moment</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                  Soyez la première entreprise à promouvoir vos services sur my Wahou et bénéficiez d'une visibilité maximale.
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition"
                >
                  Déposer une annonce maintenant
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {approvedAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-violet-500/40 transition flex flex-col justify-between group shadow-lg dark:shadow-xl"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-pink-500/15 dark:bg-pink-600/20 text-pink-600 dark:text-pink-300 border border-pink-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{ad.sponsorTag || 'SPONSORISÉ'}</span>
                        </span>

                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          {ad.category}
                        </span>
                      </div>

                      {/* Media Display */}
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                        {ad.mediaType === 'video' ? (
                          <video
                            src={ad.mediaUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BrandBirdLogo
                            logoUrl={ad.mediaUrl}
                            alt={ad.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500 bg-sky-50"
                          />
                        )}

                        {ad.status === 'posted_live' && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-red-600/90 text-white text-[10px] font-black uppercase flex items-center gap-1 backdrop-blur-sm shadow">
                            <Radio className="w-3 h-3 animate-pulse" />
                            <span>En direct sur Journée Live</span>
                          </div>
                        )}
                      </div>

                      <h4 className="text-base font-black text-zinc-900 dark:text-white mb-1">{ad.title}</h4>
                      <p className="text-xs text-violet-600 dark:text-violet-300 font-bold mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{ad.companyName}</span>
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3 mb-4">
                        {ad.description}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                      {ad.targetUrl ? (
                        <a
                          href={ad.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition shadow"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Profiter de l'offre</span>
                        </a>
                      ) : (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{ad.contactEmail}</span>
                        </div>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handlePostToLive(ad)}
                          className="px-3 py-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 hover:bg-amber-500/25 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1"
                          title="Republier sur Journée Live"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Diffuser Live</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUBMIT A NEW BUSINESS AD */}
      {activeTab === 'submit' && (
        <div className="max-w-3xl mx-auto w-full p-6 md:p-8">
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white shadow-lg">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">Créer une Campagne Publicitaire</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Remplissez les détails de votre entreprise. Une fois validée par l'admin, votre annonce sera projetée sur Journée Live !
                </p>
              </div>
            </div>

            {submitSuccess ? (
              <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 dark:text-emerald-400 mx-auto mb-3 animate-bounce" />
                <h4 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Demande envoyée avec succès !</h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 max-w-md mx-auto">
                  Votre publicité a été transmise à l'administrateur ({appSettings.appName}). Vous serez notifié dès qu'elle sera diffusée sur Journée Live.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitAd} className="space-y-5">
                {/* Company Name & Sector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Nom de l'Entreprise / Marque *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Boutique Élégance Kinshasa"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Secteur d'Activité
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    >
                      <option value="Commerce & Boutique">Commerce & Boutique</option>
                      <option value="Technologie & Mobile">Technologie & Mobile</option>
                      <option value="Mode & Beauté">Mode & Beauté</option>
                      <option value="Restauration & Événements">Restauration & Événements</option>
                      <option value="Logistique & Transport">Logistique & Transport</option>
                      <option value="Services Professionnels">Services Professionnels</option>
                      <option value="Immobilier & Finance">Immobilier & Finance</option>
                    </select>
                  </div>
                </div>

                {/* Contact Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Email Professionnel de Contact *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@entreprise.com"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Numéro WhatsApp / Téléphone
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Ex: +243 81 234 5678"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                {/* Ad Title */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Titre Accrocheur de l'Annonce *
                  </label>
                  <input
                    type="text"
                    required
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Ex: -30% sur tous les articles ce week-end !"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>

                {/* Ad Description */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Description & Détails de l'Offre *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adDescription}
                    onChange={(e) => setAdDescription(e.target.value)}
                    placeholder="Expliquez clairement votre offre, vos points forts et pourquoi les utilisateurs doivent en profiter..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition resize-none"
                  />
                </div>

                {/* Target URL & Badge Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Lien de Redirection (Site Web ou WhatsApp)
                    </label>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://votre-site.com ou https://wa.me/..."
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Slogan du Badge
                    </label>
                    <input
                      type="text"
                      value={sponsorTag}
                      onChange={(e) => setSponsorTag(e.target.value)}
                      placeholder="Ex: OFFRE SPÉCIALE, PARTENAIRE, -50%"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                {/* Media Upload / Visual support */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Visuel Publicitaire (Photo ou Vidéo pour Journée Live)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white font-bold text-xs flex items-center justify-center gap-2 transition border border-zinc-200 dark:border-zinc-700"
                    >
                      <Upload className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                      <span>Choisir un visuel (Photo/Vidéo)</span>
                    </button>

                    <input
                      type="text"
                      value={mediaUrl}
                      onChange={(e) => {
                        setMediaUrl(e.target.value);
                        setMediaType(e.target.value.includes('.mp4') ? 'video' : 'image');
                      }}
                      placeholder="Ou collez une URL d'image/vidéo directe..."
                      className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>

                  {mediaUrl && (
                    <div className="mt-3 relative w-full h-36 rounded-2xl overflow-hidden bg-black border border-zinc-300 dark:border-zinc-800">
                      {mediaType === 'video' ? (
                        <video src={mediaUrl} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaUrl('')}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white text-xs hover:bg-red-500"
                        title="Retirer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    Formule de Diffusion Souhaitée
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: '24h Live Sponsorisé', title: '24H Live', desc: 'Story Live 24h grand public' },
                      { id: '7 Jours VIP Live', title: 'Pack 7 Jours', desc: 'Diffusion 7 jours récurrents' },
                      { id: 'Campagne Mensuelle', title: 'Majeur 30J', desc: 'Story + Badge Officiel 30j' }
                    ].map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setBudgetPlan(plan.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition ${
                          budgetPlan === plan.id
                            ? 'bg-violet-50 dark:bg-violet-600/20 border-violet-500 text-zinc-900 dark:text-white shadow-md'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-xs text-zinc-900 dark:text-white mb-0.5">{plan.title}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{plan.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-black text-sm shadow-xl shadow-violet-600/30 transition flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Envoi de votre demande...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Soumettre la Publicité à l'Administrateur</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN MANAGEMENT (ONLY VISIBLE TO ADMIN) */}
      {isAdmin && activeTab === 'admin_manage' && (
        <div className="max-w-5xl mx-auto w-full p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <span>Panneau Administrateur : Validation & Diffusion Live</span>
            </h3>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              Total annonces: {ads.length}
            </span>
          </div>

          {ads.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-zinc-900/40 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm">
              Aucune demande publicitaire pour l'instant.
            </div>
          ) : (
            <div className="space-y-4">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="p-5 rounded-3xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition flex flex-col md:flex-row gap-5 items-start md:items-center justify-between shadow-sm dark:shadow-none"
                >
                  {/* Media Thumb & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <BrandBirdLogo
                      logoUrl={ad.mediaUrl}
                      alt={ad.title}
                      className="w-20 h-20 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0 bg-sky-50"
                    />

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-zinc-900 dark:text-white text-base">{ad.companyName}</h4>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                          ad.status === 'posted_live'
                            ? 'bg-red-500/15 dark:bg-red-600/20 text-red-600 dark:text-red-300 border border-red-500/40'
                            : ad.status === 'approved'
                            ? 'bg-emerald-500/15 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                            : ad.status === 'rejected'
                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            : 'bg-amber-500/15 dark:bg-amber-600/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                        }`}>
                          {ad.status === 'posted_live' ? '🔴 Diffusé Live' : ad.status === 'approved' ? '✅ Validé' : ad.status === 'rejected' ? '❌ Rejeté' : '⏳ En attente'}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {ad.category}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-violet-600 dark:text-violet-300">{ad.title}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 max-w-xl leading-relaxed">{ad.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 pt-1">
                        <span>Email: <strong className="text-zinc-800 dark:text-zinc-300">{ad.contactEmail}</strong></span>
                        {ad.contactPhone && <span>Tél: <strong className="text-zinc-800 dark:text-zinc-300">{ad.contactPhone}</strong></span>}
                        <span>Formule: <strong className="text-violet-600 dark:text-violet-400">{ad.budgetPlan}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Admin */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-zinc-200 dark:border-zinc-800">
                    {/* Diffuser sur Journée Live Button */}
                    <button
                      onClick={() => handlePostToLive(ad)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-pink-600/30 transition flex items-center gap-1.5"
                      title="Projetter cette pub sur Journée Live"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Diffuser sur Journée Live</span>
                    </button>

                    {ad.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'approved')}
                          className="p-2 rounded-xl bg-emerald-500/15 dark:bg-emerald-600/20 hover:bg-emerald-500/25 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition"
                          title="Approuver"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'rejected')}
                          className="p-2 rounded-xl bg-red-500/15 dark:bg-red-600/20 hover:bg-red-500/25 dark:hover:bg-red-600/30 text-red-600 dark:text-red-300 border border-red-500/40 text-xs font-bold transition"
                          title="Rejeter"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Branding */}
      <div className="p-8 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-600 border-t border-zinc-200 dark:border-zinc-900 mt-auto">
        ⚡ <span>développer part wastus spart 2026</span> • {appSettings.appName || 'my Wahou'} Entreprise
      </div>
    </div>
  );
}
