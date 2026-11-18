import { ReactNode, useState } from 'react';
import {
  MessageSquare,
  Radio,
  User,
  Shield,
  Share2,
  Video,
  ShoppingBag,
  ArrowLeft,
  Menu,
  MoreVertical,
  X,
  ChevronRight
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { isUserAdmin } from '../services/dbService';
import { UserAvatar } from './UserAvatar';
import { BrandBirdLogo } from './BrandBirdLogo';
import { playUiTapSound, playUiNavSound } from '../utils/soundUtils';

export type AppSpace = 'discussion' | 'lisanga' | 'live' | 'profil' | 'mobile_app';

interface NavigationRailProps {
  currentSpace: AppSpace;
  onSelectSpace: (space: AppSpace) => void;
  currentUser: UserProfile;
  appSettings: AppSettings;
  onOpenAdmin: () => void;
  onOpenWebLink: () => void;
  unreadCount?: number;
  isInsideConversation?: boolean; // True when currently inside a chat conversation
}

export function NavigationRail({
  currentSpace,
  onSelectSpace,
  currentUser,
  appSettings,
  onOpenAdmin,
  onOpenWebLink,
  unreadCount = 0,
  isInsideConversation = false,
}: NavigationRailProps) {
  const isAdmin = isUserAdmin(currentUser);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);

  const navItems: { id: AppSpace; label: string; icon: ReactNode; badge?: string; count?: number }[] = [
    {
      id: 'discussion',
      label: 'Discussions',
      icon: <MessageSquare className="w-5 h-5" />,
      count: unreadCount,
    },
    {
      id: 'lisanga',
      label: '(Lisanga)',
      icon: <Video className="w-5 h-5" />,
      badge: 'Direct',
    },
    {
      id: 'live',
      label: 'Journée Live',
      icon: <Radio className="w-5 h-5" />,
      badge: '24H',
    },
    {
      id: 'profil',
      label: 'Mon Profil',
      icon: <User className="w-5 h-5" />,
    },
    {
      id: 'mobile_app',
      label: 'Marketplace',
      icon: <ShoppingBag className="w-5 h-5" />,
    },
  ];

  // Desktop left rail stays hidden on mobile (hidden md:flex).
  // Bottom menu bars are hidden completely whenever inside a conversation (1-on-1 or Lisanga group).

  return (
    <>
      {/* DESKTOP / TABLET VERTICAL LEFT RAIL */}
      <nav
        id="desktop-navigation-rail"
        className="hidden md:flex flex-col items-center justify-between w-20 glass-titanium border-r border-zinc-200/80 dark:border-white/10 py-5 z-30 select-none shrink-0 shadow-2xl"
      >
        {/* App Mini Logo */}
        <div className="flex flex-col items-center gap-5">
          <div
            onClick={() => {
              playUiNavSound();
              onSelectSpace('discussion');
            }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 p-0.5 flex items-center justify-center text-white shadow-xl shadow-violet-600/30 cursor-pointer hover:scale-105 active:scale-95 transition border border-white/20 ring-1 ring-white/10"
            title={appSettings.appName || 'my Wahou'}
          >
            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-white to-sky-50 flex items-center justify-center p-1 overflow-hidden">
              <BrandBirdLogo
                logoUrl={appSettings.logoUrl}
                alt="Logo my Wahou"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col items-center gap-2.5 mt-2">
            {navItems.map((item) => {
              const isActive = currentSpace === item.id;
              const hasUnread = Boolean(item.count && item.count > 0);

              return (
                <button
                  key={item.id}
                  id={`nav-rail-btn-${item.id}`}
                  onClick={() => {
                    playUiNavSound();
                    onSelectSpace(item.id);
                  }}
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative group ${
                    isActive
                      ? 'glass-pill-active text-zinc-900 dark:text-white shadow-lg shadow-violet-950/20 dark:shadow-violet-950/50 scale-105'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-900/5 dark:hover:bg-white/5 hover:border hover:border-zinc-300/60 dark:hover:border-white/5'
                  }`}
                  title={item.label}
                >
                  <div className="relative flex items-center justify-center">
                    <span className={`transition-transform duration-200 ${isActive ? 'scale-110 text-violet-600 dark:text-cyan-400' : ''}`}>
                      {item.icon}
                    </span>
                    {hasUnread && (
                      <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-red-500/50 ring-2 ring-white dark:ring-zinc-950 animate-bounce">
                        {item.count! > 99 ? '99+' : item.count}
                      </span>
                    )}
                  </div>

                  <span className={`text-[9px] font-bold tracking-tight text-center leading-none mt-0.5 ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {item.label}
                  </span>

                  {item.badge && !hasUnread && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[8px] font-black uppercase shadow-md shadow-pink-500/30 ring-1 ring-white/20">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions: Admin, Share, Profile */}
        <div className="flex flex-col items-center gap-3.5">
          {isAdmin && (
            <button
              id="nav-rail-admin-btn"
              onClick={() => {
                playUiTapSound();
                onOpenAdmin();
              }}
              className="w-12 h-12 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex flex-col items-center justify-center gap-0.5 transition shadow-sm hover:scale-105 active:scale-95"
              title="Panneau Administrateur"
            >
              <Shield className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase">Admin</span>
            </button>
          )}

          <button
            onClick={() => {
              playUiTapSound();
              onOpenWebLink();
            }}
            className="p-2.5 rounded-2xl bg-zinc-900/5 dark:bg-white/5 hover:bg-zinc-900/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10 transition hover:scale-105 active:scale-95 shadow-sm"
            title="Lien web & Partage"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <div
            onClick={() => {
              playUiNavSound();
              onSelectSpace('profil');
            }}
            className="relative cursor-pointer hover:opacity-90 transition group hover:scale-105"
            title="Mon Profil"
          >
            <UserAvatar
              name={currentUser.displayName}
              avatarUrl={currentUser.avatarUrl}
              size="md"
              isVIP={currentUser.isVIP}
              isOnline={currentUser.isOnline}
              showOnlineStatus={true}
              className="border-2 border-zinc-300 dark:border-white/20 group-hover:border-cyan-400 shadow-md transition"
            />
          </div>
        </div>
      </nav>

      {/* BOTTOM NAVIGATION BARS (Hidden completely inside any discussion) */}
      {!isInsideConversation && (
        currentSpace === 'discussion' ? (
        <div className="md:hidden fixed bottom-3 inset-x-3 z-40 select-none pointer-events-none">
          <nav
            id="mobile-bottom-navigation-bar"
            className="glass-titanium-dock rounded-3xl p-1.5 flex items-center justify-around shadow-2xl pointer-events-auto border border-zinc-200/80 dark:border-white/15"
          >
            {navItems.map((item) => {
              const isActive = currentSpace === item.id;
              const hasUnread = Boolean(item.count && item.count > 0);

              return (
                <button
                  key={item.id}
                  id={`mobile-nav-btn-${item.id}`}
                  onClick={() => {
                    playUiNavSound();
                    onSelectSpace(item.id);
                  }}
                  className={`flex-1 py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90 relative ${
                    isActive
                      ? 'glass-pill-active text-zinc-900 dark:text-white font-bold shadow-md shadow-violet-950/20 dark:shadow-violet-950/40'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <span className={`transition-transform duration-200 ${isActive ? 'scale-110 text-violet-600 dark:text-cyan-400' : ''}`}>
                      {item.icon}
                    </span>
                    {hasUnread ? (
                      <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-red-500/50 ring-2 ring-white dark:ring-zinc-950 animate-pulse">
                        {item.count! > 99 ? '99+' : item.count}
                      </span>
                    ) : (
                      item.badge && (
                        <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[8px] font-black uppercase shadow-md shadow-pink-500/30 ring-1 ring-white/20">
                          {item.badge}
                        </span>
                      )
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold leading-tight tracking-tight whitespace-nowrap ${isActive ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : (
        /* CASE B: In other spaces (Lisanga list, Live, Profil, Marketplace) ->
           Bottom bar shows ONLY:
           - On the LEFT: "Retour à l'espace discussion"
           - On the RIGHT: 3 dots (MoreVertical) menu giving access to other spaces as options */
        <div className="fixed bottom-3 inset-x-3 z-40 select-none pointer-events-none">
          <nav
            id="mobile-space-mini-nav-bar"
            className="glass-titanium-dock rounded-3xl p-2 px-4 flex items-center justify-between shadow-2xl pointer-events-auto border border-zinc-200/80 dark:border-white/20 max-w-lg mx-auto"
          >
            {/* Left: Back to Discussion Space */}
            <button
              id="mini-nav-back-to-discussion-btn"
              onClick={() => {
                playUiNavSound();
                onSelectSpace('discussion');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900/5 dark:bg-white/10 hover:bg-zinc-900/10 dark:hover:bg-white/15 text-zinc-900 dark:text-white font-bold text-xs transition active:scale-95 border border-zinc-200 dark:border-white/10 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              <span>Retour à l'espace discussion</span>
            </button>

            {/* Right: 3 dots menu */}
            <button
              id="mini-nav-spaces-menu-btn"
              onClick={() => {
                playUiTapSound();
                setShowSpacesMenu(true);
              }}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white transition active:scale-95 shadow-md shadow-violet-600/30 flex items-center gap-1.5"
              title="Autres espaces & options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </nav>
        </div>
        )
      )}

      {/* POPUP / SHEET FOR OTHER SPACES OPTIONS */}
      {showSpacesMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in select-none">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/15 rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <MoreVertical className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Changer d'espace</h4>
              </div>
              <button
                onClick={() => {
                  playUiTapSound();
                  setShowSpacesMenu(false);
                }}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = currentSpace === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      playUiNavSound();
                      onSelectSpace(item.id);
                      setShowSpacesMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition ${
                      isActive
                        ? 'bg-violet-600/15 dark:bg-violet-600/30 text-violet-900 dark:text-white font-bold border border-violet-500/40'
                        : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-violet-600 dark:text-cyan-400' : 'text-zinc-500 dark:text-zinc-400'}>{item.icon}</span>
                      <span className="text-xs">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
