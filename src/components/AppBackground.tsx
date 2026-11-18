import { useEffect, useState } from 'react';
import { AppThemeConfig, getStoredAppTheme, applyThemeModeToDom } from '../utils/themeUtils';

export function AppBackground() {
  const [theme, setTheme] = useState<AppThemeConfig>(getStoredAppTheme);

  useEffect(() => {
    applyThemeModeToDom(theme.themeMode || 'dark');
  }, [theme.themeMode]);

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<AppThemeConfig>) => {
      if (e.detail) {
        setTheme(e.detail);
      } else {
        setTheme(getStoredAppTheme());
      }
    };

    window.addEventListener('mywahou_theme_updated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('mywahou_theme_updated', handleUpdate as EventListener);
    };
  }, []);

  const isLight = theme.themeMode === 'light';
  const isCustomImage = theme.globalWallpaperType === 'custom' && theme.globalWallpaperValue;
  const isColor = theme.globalWallpaperType === 'color';
  const isBokeh = theme.globalWallpaperType === 'preset' && theme.globalWallpaperValue === 'luminous_bokeh';
  const isAurora = theme.globalWallpaperType === 'preset' && theme.globalWallpaperValue === 'deep_aurora';
  const isNebula = theme.globalWallpaperType === 'preset' && theme.globalWallpaperValue === 'cosmic_nebula';
  const isSunset = theme.globalWallpaperType === 'preset' && theme.globalWallpaperValue === 'sunset_wahou';
  const isTitanium = theme.globalWallpaperType === 'preset' && theme.globalWallpaperValue === 'pure_titanium';

  return (
    <div
      id="app-dynamic-background"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#f5f3ff] dark:bg-[#09090c] transition-colors duration-300"
      aria-hidden="true"
    >
      {/* 1. Custom Image Wallpaper from Gallery */}
      {isCustomImage && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform scale-105"
          style={{
            backgroundImage: `url(${theme.globalWallpaperValue})`,
            filter: theme.blurAmount > 0 ? `blur(${theme.blurAmount}px)` : undefined,
          }}
        />
      )}

      {/* 2. Custom Solid/Gradient Color */}
      {isColor && (
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            background: theme.globalWallpaperValue || (isLight ? '#f5f3ff' : '#09090c'),
          }}
        />
      )}

      {/* 3. Preset: Luminous Bokeh Orbs */}
      {(isBokeh || (!isCustomImage && !isColor && !isAurora && !isNebula && !isSunset && !isTitanium)) && (
        <div className="absolute inset-0 overflow-hidden">
          {isLight ? (
            <div className="absolute inset-0 bg-gradient-to-b from-[#f8f6ff] via-[#f4f4f9] to-[#eef2ff]" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a15] via-[#09090e] to-[#050508]" />
          )}

          {/* Luminous glowing neon orbs */}
          <div className={`absolute top-[8%] left-[-10%] w-[320px] sm:w-[420px] h-[320px] sm:h-[420px] rounded-full bg-gradient-to-br ${isLight ? 'from-violet-400/25 via-purple-400/15' : 'from-violet-600/40 via-purple-600/30'} to-transparent blur-[65px] animate-pulse`} />
          <div className={`absolute top-[18%] right-[-8%] w-[280px] sm:w-[380px] h-[280px] sm:h-[380px] rounded-full bg-gradient-to-bl ${isLight ? 'from-cyan-400/20 via-teal-400/15' : 'from-cyan-500/35 via-teal-600/25'} to-transparent blur-[70px]`} />
          <div className={`absolute top-[48%] left-[10%] w-[260px] sm:w-[350px] h-[260px] sm:h-[350px] rounded-full bg-gradient-to-tr ${isLight ? 'from-fuchsia-400/20 via-pink-400/15' : 'from-fuchsia-600/30 via-pink-600/20'} to-transparent blur-[75px]`} />
          <div className={`absolute bottom-[10%] right-[5%] w-[340px] sm:w-[460px] h-[340px] sm:h-[460px] rounded-full bg-gradient-to-tl ${isLight ? 'from-indigo-400/20 via-cyan-400/15' : 'from-indigo-600/35 via-cyan-600/25'} to-transparent blur-[80px]`} />
          <div className={`absolute bottom-[-5%] left-[25%] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-gradient-to-tr ${isLight ? 'from-purple-400/20 via-violet-400/10' : 'from-purple-700/30 via-violet-800/20'} to-transparent blur-[60px]`} />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)]" />
        </div>
      )}

      {/* 4. Preset: Deep Aurora */}
      {isAurora && (
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-b from-teal-50 via-cyan-50 to-slate-50' : 'bg-gradient-to-b from-[#031517] via-[#050d12] to-[#040608]'}`} />
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/25 blur-[90px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/25 blur-[90px]" />
          <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-emerald-500/15 blur-[80px]" />
        </div>
      )}

      {/* 5. Preset: Cosmic Nebula */}
      {isNebula && (
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-b from-fuchsia-50 via-purple-50 to-slate-50' : 'bg-gradient-to-b from-[#12041c] via-[#0b0312] to-[#050208]'}`} />
          <div className="absolute top-[5%] left-[10%] w-[450px] h-[450px] rounded-full bg-fuchsia-600/25 blur-[85px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[480px] h-[480px] rounded-full bg-purple-600/30 blur-[90px]" />
        </div>
      )}

      {/* 6. Preset: Sunset Wahou */}
      {isSunset && (
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-b from-orange-50 via-rose-50 to-slate-50' : 'bg-gradient-to-b from-[#180707] via-[#0e0407] to-[#060204]'}`} />
          <div className="absolute top-[10%] right-[5%] w-[420px] h-[420px] rounded-full bg-orange-500/20 blur-[80px]" />
          <div className="absolute bottom-[20%] left-[5%] w-[450px] h-[450px] rounded-full bg-rose-600/20 blur-[85px]" />
        </div>
      )}

      {/* 7. Preset: Pure Titanium */}
      {isTitanium && (
        <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-b from-zinc-100 via-white to-zinc-200' : 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black'}`} />
      )}

      {/* Overlay for optimal text contrast and readability */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          backgroundColor: isLight ? '#ffffff' : '#000000',
          opacity: isLight
            ? Math.min(0.25, (theme.overlayOpacity ?? 45) / 300)
            : (theme.overlayOpacity ?? 45) / 100,
        }}
      />
    </div>
  );
}
