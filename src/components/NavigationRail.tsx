import { ReactNode } from 'react';
import {
  MessageSquare,
  Radio,
  User,
  Smartphone,
  Shield,
  Share2,
  Crown,
  Users
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { isUserAdmin } from '../services/dbService';
import { UserAvatar } from './UserAvatar';

export type AppSpace = 'discussion' | 'lisanga' | 'live' | 'profil' | 'mobile_app';

interface NavigationRailProps {
  currentSpace: AppSpace;
  onSelectSpace: (space: AppSpace) => void;
  currentUser: UserProfile;
  appSettings: AppSettings;
  onOpenAdmin: () => void;
  onOpenWebLink: () => void;
  unreadCount?: number;
}

export function NavigationRail({
  currentSpace,
  onSelectSpace,
  currentUser,
  appSettings,
  onOpenAdmin,
  onOpenWebLink,
  unreadCount = 0,
}: NavigationRailProps) {
  const isAdmin = isUserAdmin(currentUser);

  const navItems: { id: AppSpace; label: string; icon: ReactNode; badge?: string; count?: number }[] = [
    {
      id: 'discussion',
      label: 'Discussions',
      icon: <MessageSquare className="w-5 h-5" />,
      count: unreadCount,
    },
    {
      id: 'lisanga',
      label: 'Lisanga',
      icon: <Users className="w-5 h-5" />,
      badge: 'Groupes',
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
      label: 'App Mobile',
      icon: <Smartphone className="w-5 h-5" />,
      badge: 'iOS/Android',
    },
  ];

  return (
    <>
      {/* DESKTOP / TABLET VERTICAL LEFT RAIL */}
      <nav
        id="desktop-navigation-rail"
        className="hidden md:flex flex-col items-center justify-between w-20 bg-zinc-950 border-r border-zinc-800/80 py-4 z-30 select-none shrink-0"
      >
        {/* App Mini Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            onClick={() => onSelectSpace('discussion')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30 cursor-pointer hover:scale-105 transition"
            title={appSettings.appName || 'my Wahou'}
          >
            {appSettings.logoUrl ? (
              <img
                src={appSettings.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <MessageSquare className="w-6 h-6" />
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col items-center gap-2 mt-4">
            {navItems.map((item) => {
              const isActive = currentSpace === item.id;
              const hasUnread = Boolean(item.count && item.count > 0);

              return (
                <button
                  key={item.id}
                  id={`nav-rail-btn-${item.id}`}
                  onClick={() => onSelectSpace(item.id)}
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition relative group ${
                    isActive
                      ? 'bg-gradient-to-br from-violet-600/30 to-pink-600/30 text-white border border-violet-500/50 shadow-md shadow-violet-600/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                  title={item.label}
                >
                  <div className="relative">
                    {item.icon}
                    {/* Visual Red Unread Notification Badge (Pastille rouge) */}
                    {hasUnread && (
                      <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-red-600/50 ring-2 ring-zinc-950 animate-bounce">
                        {item.count! > 99 ? '99+' : item.count}
                      </span>
                    )}
                  </div>

                  <span className="text-[9px] font-bold tracking-tight text-center leading-none mt-0.5">
                    {item.label}
                  </span>

                  {item.badge && !hasUnread && (
                    <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-pink-600 text-white text-[8px] font-black uppercase shadow">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions: Admin, Share, Profile */}
        <div className="flex flex-col items-center gap-3">
          {isAdmin && (
            <button
              id="nav-rail-admin-btn"
              onClick={onOpenAdmin}
              className="w-12 h-12 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex flex-col items-center justify-center gap-0.5 transition shadow-sm"
              title="Panneau Administrateur"
            >
              <Shield className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase">Admin</span>
            </button>
          )}

          <button
            onClick={onOpenWebLink}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-violet-300 transition"
            title="Lien web & Partage"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <div
            onClick={() => onSelectSpace('profil')}
            className="relative cursor-pointer hover:opacity-90 transition group"
            title="Mon Profil"
          >
            <UserAvatar
              name={currentUser.displayName}
              avatarUrl={currentUser.avatarUrl}
              size="md"
              isVIP={currentUser.isVIP}
              isOnline={currentUser.isOnline}
              showOnlineStatus={true}
              className="border-2 border-violet-500/80 group-hover:border-pink-500"
            />
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        id="mobile-bottom-navigation-bar"
        className="md:hidden fixed bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/90 px-2 py-2 flex items-center justify-around z-40 select-none shadow-2xl safe-area-pb"
      >
        {navItems.map((item) => {
          const isActive = currentSpace === item.id;
          const hasUnread = Boolean(item.count && item.count > 0);

          return (
            <button
              key={item.id}
              id={`mobile-nav-btn-${item.id}`}
              onClick={() => onSelectSpace(item.id)}
              className={`flex-1 py-1.5 px-0.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative ${
                isActive
                  ? 'text-pink-400 bg-zinc-900/90 font-bold shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon}
                {/* Visual Red Unread Notification Badge Mobile (Pastille rouge) */}
                {hasUnread ? (
                  <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-red-600/50 ring-2 ring-zinc-950 animate-pulse">
                    {item.count! > 99 ? '99+' : item.count}
                  </span>
                ) : (
                  item.badge && (
                    <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-pink-600 to-violet-600 text-white text-[8px] font-black uppercase shadow-sm">
                      {item.badge}
                    </span>
                  )
                )}
              </div>
              <span className="text-[10px] font-bold leading-tight tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
