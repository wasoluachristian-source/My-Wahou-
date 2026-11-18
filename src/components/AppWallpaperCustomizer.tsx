import React, { useState, useRef, ChangeEvent } from 'react';
import {
  Sparkles,
  Upload,
  Trash2,
  Check,
  Sliders,
  Palette,
  Eye,
  RefreshCw,
  SunMedium,
  Sun,
  Moon
} from 'lucide-react';
import {
  AppThemeConfig,
  PRESET_WALLPAPERS,
  getStoredAppTheme,
  saveStoredAppTheme,
  DEFAULT_THEME_CONFIG
} from '../utils/themeUtils';
import { compressImageFile } from '../utils/mediaUtils';
import { playUiTapSound } from '../utils/soundUtils';

export function AppWallpaperCustomizer() {
  const [theme, setTheme] = useState<AppThemeConfig>(getStoredAppTheme);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyThemeUpdate = (newTheme: AppThemeConfig) => {
    setTheme(newTheme);
    saveStoredAppTheme(newTheme);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleToggleMode = (mode: 'dark' | 'light') => {
    playUiTapSound();
    applyThemeUpdate({
      ...theme,
      themeMode: mode,
    });
  };

  const handleSelectPreset = (presetId: string) => {
    playUiTapSound();
    applyThemeUpdate({
      ...theme,
      globalWallpaperType: 'preset',
      globalWallpaperValue: presetId,
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64 = await compressImageFile(file);
      playUiTapSound();
      applyThemeUpdate({
        ...theme,
        globalWallpaperType: 'custom',
        globalWallpaperValue: base64,
      });
    } catch (err) {
      console.error('Error uploading app wallpaper:', err);
      alert('Erreur lors du traitement de la photo de galerie.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDefault = () => {
    playUiTapSound();
    applyThemeUpdate(DEFAULT_THEME_CONFIG);
  };

  return (
    <div id="app-wallpaper-customizer-section" className="space-y-6 select-none">
      {/* Header card */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 backdrop-blur-xl relative overflow-hidden shadow-sm">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-violet-600/20 to-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-violet-600/30">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                Personnalisation & Thème de l'application
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Choisissez entre Mode Clair / Sombre, une photo de votre galerie ou un fond personnalisé
              </p>
            </div>
          </div>

          <button
            onClick={handleResetDefault}
            className="px-3.5 py-2 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
            <span>Thème officiel par défaut</span>
          </button>
        </div>

        {saveToast && (
          <div className="mt-3 py-1 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Préférences appliquées à toute l'application !</span>
          </div>
        )}
      </div>

      {/* Mode Clair / Mode Sombre Toggler */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 backdrop-blur-xl space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              {theme.themeMode === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-violet-400" />
              )}
              <span>Apparence (Mode Clair / Sombre)</span>
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Basculez entre le mode sombre et le mode clair tout en conservant les couleurs my Wahou.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            id="theme-toggle-light-btn"
            type="button"
            onClick={() => handleToggleMode('light')}
            className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs transition active:scale-98 ${
              theme.themeMode === 'light'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white border-violet-500 shadow-lg shadow-violet-600/25'
                : 'bg-zinc-100 dark:bg-zinc-950/70 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Mode Clair</span>
          </button>

          <button
            id="theme-toggle-dark-btn"
            type="button"
            onClick={() => handleToggleMode('dark')}
            className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs transition active:scale-98 ${
              theme.themeMode !== 'light'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white border-violet-500 shadow-lg shadow-violet-600/25'
                : 'bg-zinc-100 dark:bg-zinc-950/70 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Mode Sombre</span>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Option 1: Choisir depuis la Galerie */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 backdrop-blur-xl space-y-4 shadow-sm">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-violet-400" />
          <span>Photo personnalisée depuis votre galerie</span>
        </h4>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Choisissez n'importe quelle photo de votre téléphone (paysage, photo personnelle, portrait...) pour l'afficher en fond d'écran de l'application.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>{isProcessing ? 'Traitement en cours...' : '📷 Choisir une photo sur ma galerie'}</span>
          </button>

          {theme.globalWallpaperType === 'custom' && (
            <button
              onClick={() => handleSelectPreset('luminous_bokeh')}
              className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-600 dark:text-red-300 font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Retirer la photo de galerie</span>
            </button>
          )}
        </div>
      </div>

      {/* Option 2: Papiers Peints & Thèmes Prédéfinis */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 backdrop-blur-xl space-y-4 shadow-sm">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Thèmes d'ambiance prédéfinis</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PRESET_WALLPAPERS.map((preset) => {
            const isSelected =
              theme.globalWallpaperType === 'preset' &&
              theme.globalWallpaperValue === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-95 relative overflow-hidden group ${
                  isSelected
                    ? 'border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-950/30 ring-2 ring-violet-500/40 shadow-xl shadow-violet-500/15 dark:shadow-violet-950/50'
                    : 'border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                }`}
              >
                {/* Visual miniature mockup */}
                <div
                  className={`w-full h-16 rounded-xl bg-gradient-to-r ${preset.previewGradient} border border-white/15 mb-3 flex items-center justify-center relative overflow-hidden`}
                >
                  {preset.id === 'luminous_bokeh' && (
                    <div className="absolute inset-0 flex items-center justify-around opacity-75">
                      <div className="w-8 h-8 rounded-full bg-violet-500 blur-sm animate-pulse" />
                      <div className="w-7 h-7 rounded-full bg-cyan-400 blur-sm" />
                      <div className="w-8 h-8 rounded-full bg-pink-500 blur-sm" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg relative z-10">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="font-bold text-xs text-zinc-900 dark:text-white mb-1 flex items-center justify-between">
                  <span>{preset.name}</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  {preset.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Option 3: Réglages d'Opacité & Flou (Pour la lisibilité) */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 backdrop-blur-xl space-y-4 shadow-sm">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Ajustements de lisibilité</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Overlay Darkening */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <SunMedium className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Assombrissement du fond :
              </span>
              <span className="font-mono text-cyan-600 dark:text-cyan-300">{theme.overlayOpacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="85"
              step="5"
              value={theme.overlayOpacity}
              onChange={(e) =>
                applyThemeUpdate({
                  ...theme,
                  overlayOpacity: Number(e.target.value),
                })
              }
              className="w-full accent-violet-500 cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500">
              Augmentez si vous souhaitez que les textes soient encore plus faciles à lire sur une photo claire.
            </p>
          </div>

          {/* Blur level */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                Effet Flou d'arrière-plan :
              </span>
              <span className="font-mono text-pink-600 dark:text-pink-300">{theme.blurAmount}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              step="1"
              value={theme.blurAmount}
              onChange={(e) =>
                applyThemeUpdate({
                  ...theme,
                  blurAmount: Number(e.target.value),
                })
              }
              className="w-full accent-pink-500 cursor-pointer"
            />
            <p className="text-[10px] text-zinc-500">
              Adoucit les détails de l'arrière-plan pour une ambiance plus feutrée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
