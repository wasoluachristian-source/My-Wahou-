import React, { useState, useRef, ChangeEvent } from 'react';
import {
  X,
  Image as ImageIcon,
  Trash2,
  Check,
  Upload,
  Palette,
  Sparkles,
  Pipette,
  Sun
} from 'lucide-react';
import {
  PRESET_CHAT_WALLPAPERS,
  PRESET_CHAT_COLORS,
  getStoredChatWallpaper,
  saveStoredChatWallpaper
} from '../utils/themeUtils';
import { compressImageFile } from '../utils/mediaUtils';
import { playUiTapSound } from '../utils/soundUtils';

interface ChatWallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  contactName: string;
}

type WallpaperTab = 'photos' | 'colors';

export function ChatWallpaperModal({
  isOpen,
  onClose,
  conversationId,
  contactName,
}: ChatWallpaperModalProps) {
  const [activeTab, setActiveTab] = useState<WallpaperTab>('photos');
  const [currentWallpaper, setCurrentWallpaper] = useState<string | null>(() =>
    getStoredChatWallpaper(conversationId)
  );
  const [customHexColor, setCustomHexColor] = useState('#1e1035');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSelectWallpaper = (value: string) => {
    playUiTapSound();
    setCurrentWallpaper(value);
    saveStoredChatWallpaper(conversationId, value);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64 = await compressImageFile(file);
      setCurrentWallpaper(base64);
      saveStoredChatWallpaper(conversationId, base64);
      playUiTapSound();
    } catch (err) {
      console.error('Error uploading chat wallpaper:', err);
      alert('Erreur lors du traitement de la photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCustomColor = (colorHex: string) => {
    setCustomHexColor(colorHex);
    handleSelectWallpaper(colorHex);
  };

  const handleRemoveWallpaper = () => {
    playUiTapSound();
    setCurrentWallpaper(null);
    saveStoredChatWallpaper(conversationId, null);
  };

  const isImageWallpaper =
    currentWallpaper &&
    (currentWallpaper.startsWith('data:image') ||
      currentWallpaper.startsWith('http') ||
      currentWallpaper.startsWith('blob:'));

  return (
    <div
      id="chat-wallpaper-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="chat-wallpaper-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-950/95 border border-white/15 rounded-3xl p-5 sm:p-6 text-white shadow-2xl overflow-y-auto max-h-[90dvh] relative select-none"
      >
        {/* Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-600/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Arrière-plan de la discussion
              </h3>
              <p className="text-xs text-zinc-400">
                Personnaliser l'ambiance avec <strong className="text-violet-300">{contactName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Photos vs Couleurs) */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 mb-4">
          <button
            onClick={() => {
              playUiTapSound();
              setActiveTab('photos');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'photos'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo / Galerie</span>
          </button>

          <button
            onClick={() => {
              playUiTapSound();
              setActiveTab('colors');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'colors'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Couleurs & Dégradés</span>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Live Preview Box (Photo 1 Simulation) */}
        <div className="mb-4 relative rounded-2xl overflow-hidden border border-white/15 h-36 flex flex-col justify-end p-3 shadow-inner group">
          {currentWallpaper ? (
            isImageWallpaper ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url(${currentWallpaper})` }}
              />
            ) : (
              <div
                className="absolute inset-0 transition-all duration-300"
                style={{ background: currentWallpaper }}
              />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 flex items-center justify-center text-xs text-zinc-400">
              Arrière-plan par défaut (Thème de l'application)
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />

          {/* Sample Chat Bubbles Overlay (Like Photo 1) */}
          <div className="relative z-10 flex flex-col gap-1.5 w-full">
            <div className="self-start px-3 py-1.5 rounded-2xl glass-bubble-received text-[11px] text-white">
              Slt, tu as vu la nouvelle mise à jour ? 👋
            </div>
            <div className="self-end px-3 py-1.5 rounded-2xl glass-bubble-sent text-[11px] text-white font-medium flex items-center gap-1">
              <span>Oui c'est super fluide et transparent ! ✨</span>
              <span className="text-[9px] text-violet-200">✓✓</span>
            </div>
          </div>
        </div>

        {/* TAB 1: PHOTOS */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {/* Upload Action */}
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-2 block">
                📷 Importer depuis votre appareil
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-600/30 via-indigo-600/30 to-pink-600/30 hover:from-violet-600/40 hover:to-pink-600/40 border border-violet-500/40 text-white text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-violet-950/40"
                >
                  <Upload className="w-4 h-4 text-violet-400" />
                  <span>{isProcessing ? 'Traitement...' : 'Ouvrir ma galerie photo'}</span>
                </button>

                {currentWallpaper && (
                  <button
                    onClick={handleRemoveWallpaper}
                    className="p-3.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Réinitialiser par défaut</span>
                  </button>
                )}
              </div>
            </div>

            {/* Presets Photos */}
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Photos d'ambiance suggérées :</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_CHAT_WALLPAPERS.map((preset) => {
                  const isSelected = currentWallpaper === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectWallpaper(preset.url)}
                      className={`relative rounded-2xl overflow-hidden h-20 border cursor-pointer group transition duration-200 active:scale-95 ${
                        isSelected
                          ? 'border-violet-400 ring-2 ring-violet-500 shadow-lg shadow-violet-600/40'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                        <span className="text-[10px] font-bold text-white leading-tight truncate">
                          {preset.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COLORS & GRADIENTS */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            {/* Color Palettes Grid */}
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Palettes & Dégradés Modernes :</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_CHAT_COLORS.map((colorItem) => {
                  const isSelected = currentWallpaper === colorItem.style;
                  return (
                    <div
                      key={colorItem.id}
                      onClick={() => handleSelectWallpaper(colorItem.style)}
                      className={`relative rounded-2xl overflow-hidden h-18 border cursor-pointer group transition duration-200 active:scale-95 p-2 flex flex-col justify-between ${
                        isSelected
                          ? 'border-violet-400 ring-2 ring-violet-500 shadow-lg shadow-violet-600/40'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ background: colorItem.style }}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-3.5 h-3.5 rounded-full ring-1 ring-white/30 shadow-sm"
                          style={{ backgroundColor: colorItem.preview }}
                        />
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-md">
                            <Check className="w-2.5 h-2.5 font-bold" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-white drop-shadow-sm truncate">
                        {colorItem.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Hex Color Picker */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <label className="text-xs font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
                <Pipette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Choisir une couleur sur mesure :</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customHexColor}
                  onChange={(e) => handleApplyCustomColor(e.target.value)}
                  className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={customHexColor}
                  onChange={(e) => handleApplyCustomColor(e.target.value)}
                  placeholder="#1e1035"
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => handleApplyCustomColor(customHexColor)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition active:scale-95"
                >
                  Appliquer
                </button>
              </div>
            </div>

            {currentWallpaper && (
              <button
                onClick={handleRemoveWallpaper}
                className="w-full p-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Réinitialiser par défaut</span>
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition active:scale-95 text-center"
          >
            Enregistrer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

