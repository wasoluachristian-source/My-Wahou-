import { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  isVIP?: boolean;
  className?: string;
  showOnlineStatus?: boolean;
}

const GRADIENT_PALETTES = [
  'from-violet-600 to-indigo-600',
  'from-pink-600 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-purple-600 to-pink-500',
  'from-fuchsia-600 to-violet-700',
];

export function getInitials(name?: string): string {
  if (!name) return 'U';
  const clean = name.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim();
  if (!clean) return name.charAt(0).toUpperCase() || 'U';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function getGradientForName(name?: string): string {
  if (!name) return GRADIENT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

const SIZE_CONFIGS = {
  xs: {
    container: 'w-4 h-4 text-[8px]',
    online: 'w-1.5 h-1.5 -bottom-0.5 -right-0.5 border',
    crown: 'w-2 h-2',
    rounded: 'rounded-full',
  },
  sm: {
    container: 'w-7 h-7 text-[10px]',
    online: 'w-2 h-2 -bottom-0.5 -right-0.5 border',
    crown: 'w-2.5 h-2.5',
    rounded: 'rounded-full',
  },
  md: {
    container: 'w-10 h-10 text-xs sm:text-sm',
    online: 'w-3 h-3 -bottom-0.5 -right-0.5 border-2',
    crown: 'w-3 h-3',
    rounded: 'rounded-2xl',
  },
  lg: {
    container: 'w-12 h-12 text-sm sm:text-base',
    online: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 border-2',
    crown: 'w-3.5 h-3.5',
    rounded: 'rounded-2xl',
  },
  xl: {
    container: 'w-16 h-16 text-lg sm:text-xl',
    online: 'w-4 h-4 -bottom-1 -right-1 border-2',
    crown: 'w-4 h-4',
    rounded: 'rounded-3xl',
  },
  '2xl': {
    container: 'w-24 h-24 text-2xl sm:text-3xl',
    online: 'w-5 h-5 -bottom-1 -right-1 border-2',
    crown: 'w-5 h-5',
    rounded: 'rounded-3xl',
  },
};

export function UserAvatar({
  name = 'Utilisateur',
  avatarUrl,
  size = 'md',
  isOnline = false,
  isVIP = false,
  className = '',
  showOnlineStatus = false,
}: UserAvatarProps) {
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const initials = getInitials(name);
  const gradient = getGradientForName(name);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const hasRealCustomPhoto =
    !imgError &&
    avatarUrl &&
    avatarUrl.trim().length > 0 &&
    !avatarUrl.includes('placeholder') &&
    !avatarUrl.includes('unsplash.com') &&
    (avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http') || avatarUrl.startsWith('/'));

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${config.container} ${className}`}>
      {hasRealCustomPhoto ? (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover shadow-sm ${config.rounded} border border-zinc-800/80`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-tr ${gradient} ${config.rounded} flex items-center justify-center text-white font-black tracking-wider uppercase shadow-md select-none border border-white/10`}
        >
          {initials}
        </div>
      )}

      {/* Online indicator */}
      {showOnlineStatus && isOnline && (
        <span
          className={`absolute rounded-full bg-emerald-500 border-zinc-950 shadow-sm ${config.online}`}
          title="En ligne"
        />
      )}

      {/* VIP Crown badge */}
      {isVIP && (
        <span
          className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-zinc-950 shadow-md ring-1 ring-zinc-950"
          title="Membre VIP"
        >
          <Crown className={config.crown} />
        </span>
      )}
    </div>
  );
}
