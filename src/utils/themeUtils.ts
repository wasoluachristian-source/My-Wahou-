export interface AppThemeConfig {
  globalWallpaperType: 'default' | 'preset' | 'custom' | 'color';
  globalWallpaperValue: string; // Base64 data URL, preset ID, or gradient/color string
  overlayOpacity: number; // 0 to 90%
  blurAmount: number; // 0 to 20px
  themeMode: 'dark' | 'light';
}

export const PRESET_WALLPAPERS = [
  {
    id: 'luminous_bokeh',
    name: 'Orbes Luminous Bokeh (Photo 2)',
    previewGradient: 'from-violet-950 via-zinc-950 to-pink-950',
    type: 'bokeh',
    description: 'Le thème officiel my Wahou avec orbes lumineuses violettes et cyan',
  },
  {
    id: 'deep_aurora',
    name: 'Aurore Boréale Cyan',
    previewGradient: 'from-teal-950 via-zinc-950 to-indigo-950',
    type: 'aurora',
    description: 'Reflets d’aurores boréales cyan et émeraudes',
  },
  {
    id: 'cosmic_nebula',
    name: 'Nébuleuse Cosmique',
    previewGradient: 'from-purple-950 via-zinc-950 to-pink-900',
    type: 'nebula',
    description: 'Nuages stellaires et éclat violet galactique',
  },
  {
    id: 'sunset_wahou',
    name: 'Sunset Tropical Wahou',
    previewGradient: 'from-orange-950 via-zinc-950 to-rose-950',
    type: 'sunset',
    description: 'Dégradé crépuscule chaleureux',
  },
  {
    id: 'pure_titanium',
    name: 'Titanium Noir Épuré',
    previewGradient: 'from-zinc-900 via-zinc-950 to-black',
    type: 'titanium',
    description: 'Style sobre et contrasté haute performance',
  },
];

export const PRESET_CHAT_WALLPAPERS = [
  {
    id: 'romantic_duo',
    name: 'Ambiance Duo Élégant',
    url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'night_city',
    name: 'Lumières Nocturnes',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'cozy_coffee',
    name: 'Café & Détente',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'nature_calm',
    name: 'Nature & Évasion',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop',
  },
];

export const PRESET_CHAT_COLORS = [
  {
    id: 'wahou_violet',
    name: 'Violet Wahou',
    style: 'linear-gradient(135deg, #2e0854 0%, #16002c 50%, #090014 100%)',
    preview: '#7c3aed',
  },
  {
    id: 'pure_obsidian',
    name: 'Obsidian Noir',
    style: 'linear-gradient(135deg, #18181b 0%, #09090b 50%, #000000 100%)',
    preview: '#18181b',
  },
  {
    id: 'deep_ocean',
    name: 'Bleu Nuit Océan',
    style: 'linear-gradient(135deg, #0b1f3a 0%, #051329 50%, #020b18 100%)',
    preview: '#0284c7',
  },
  {
    id: 'emerald_luxe',
    name: 'Émeraude Luxe',
    style: 'linear-gradient(135deg, #063529 0%, #022018 50%, #01110d 100%)',
    preview: '#10b981',
  },
  {
    id: 'sunset_glow',
    name: 'Sunset Flamboyant',
    style: 'linear-gradient(135deg, #431407 0%, #2a081a 50%, #120320 100%)',
    preview: '#f97316',
  },
  {
    id: 'crimson_ruby',
    name: 'Rouge Rubis',
    style: 'linear-gradient(135deg, #3b0712 0%, #20040a 50%, #0d0104 100%)',
    preview: '#e11d48',
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Dégradé',
    style: 'linear-gradient(135deg, #3b0764 0%, #083344 50%, #050508 100%)',
    preview: '#ec4899',
  },
  {
    id: 'amber_gold',
    name: 'Or & Ambre',
    style: 'linear-gradient(135deg, #3a2203 0%, #1f1201 50%, #0c0700 100%)',
    preview: '#f59e0b',
  },
];

export const DEFAULT_THEME_CONFIG: AppThemeConfig = {
  globalWallpaperType: 'preset',
  globalWallpaperValue: 'luminous_bokeh',
  overlayOpacity: 45,
  blurAmount: 0,
  themeMode: 'dark',
};

export function applyThemeModeToDom(mode: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function getStoredAppTheme(): AppThemeConfig {
  try {
    const stored = localStorage.getItem('mywahou_app_theme');
    if (stored) {
      const parsed = { ...DEFAULT_THEME_CONFIG, ...JSON.parse(stored) };
      if (!parsed.themeMode) parsed.themeMode = 'dark';
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_THEME_CONFIG;
}

export function saveStoredAppTheme(theme: AppThemeConfig): void {
  try {
    const mode: 'dark' | 'light' = theme.themeMode === 'light' ? 'light' : 'dark';
    const nextTheme = { ...theme, themeMode: mode };
    localStorage.setItem('mywahou_app_theme', JSON.stringify(nextTheme));
    applyThemeModeToDom(mode);
    window.dispatchEvent(new CustomEvent('mywahou_theme_updated', { detail: nextTheme }));
  } catch (err) {
    console.error('Error saving app theme:', err);
  }
}

export function toggleStoredThemeMode(): 'dark' | 'light' {
  const current = getStoredAppTheme();
  const nextMode: 'dark' | 'light' = current.themeMode === 'light' ? 'dark' : 'light';
  saveStoredAppTheme({ ...current, themeMode: nextMode });
  return nextMode;
}

export function getStoredChatWallpaper(conversationId: string): string | null {
  try {
    return localStorage.getItem(`mywahou_chat_wallpaper_${conversationId}`);
  } catch {
    return null;
  }
}

export function saveStoredChatWallpaper(conversationId: string, wallpaperUrl: string | null): void {
  try {
    if (wallpaperUrl) {
      localStorage.setItem(`mywahou_chat_wallpaper_${conversationId}`, wallpaperUrl);
    } else {
      localStorage.removeItem(`mywahou_chat_wallpaper_${conversationId}`);
    }
    window.dispatchEvent(new CustomEvent(`mywahou_chat_wallpaper_updated_${conversationId}`, { detail: wallpaperUrl }));
  } catch (err) {
    console.error('Error saving chat wallpaper:', err);
  }
}
