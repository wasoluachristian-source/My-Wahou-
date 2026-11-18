import { useState, useEffect } from 'react';
import birdLogoBundled from '../assets/bird-logo.png';
import birdIconBundled from '../assets/bird-icon-512.png';

interface BrandBirdLogoProps {
  logoUrl?: string;
  alt?: string;
  className?: string;
  variant?: 'bird' | 'icon';
}

export function isLegacyOrBrokenLogoUrl(url?: string): boolean {
  if (!url || !url.trim()) return true;
  const normalized = url.trim().toLowerCase();
  if (
    normalized === '/bird-logo.png' ||
    normalized === 'bird-logo.png' ||
    normalized === '/icon-512.png' ||
    normalized === '/logo.png' ||
    normalized.includes('unsplash.com') ||
    normalized.includes('placeholder.com') ||
    normalized.includes('picsum.photos')
  ) {
    return true;
  }
  return false;
}

export function BrandBirdLogo({
  logoUrl,
  alt = 'my Wahou',
  className = 'w-8 h-8 object-contain',
  variant = 'bird',
}: BrandBirdLogoProps) {
  const defaultSrc = variant === 'icon' ? birdIconBundled : birdLogoBundled;
  const resolvedInitial = isLegacyOrBrokenLogoUrl(logoUrl) ? defaultSrc : logoUrl!;
  const [src, setSrc] = useState<string>(resolvedInitial);
  const [failedTwice, setFailedTwice] = useState(false);

  useEffect(() => {
    setFailedTwice(false);
    setSrc(isLegacyOrBrokenLogoUrl(logoUrl) ? defaultSrc : logoUrl!);
  }, [logoUrl, defaultSrc]);

  if (failedTwice) {
    return (
      <div
        className={`${className} rounded-xl bg-gradient-to-tr from-sky-400 via-cyan-500 to-orange-400 flex items-center justify-center text-white font-black text-xs shadow-sm`}
        aria-label={alt}
      >
        W
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => {
        if (src !== defaultSrc) {
          setSrc(defaultSrc);
        } else {
          setFailedTwice(true);
        }
      }}
      className={className}
    />
  );
}
