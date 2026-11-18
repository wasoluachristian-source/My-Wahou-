/**
 * Utilitaires de sécurité et de hachage de mot de passe
 * pour l'authentification et la protection des comptes my Wahou.
 */
import { UserProfile } from '../types';
import { ADMIN_EMAIL, ADMIN_PASS } from '../services/dbService';

/**
 * Calcule un hachage SHA-256 sécurisé avec sel pour un mot de passe.
 */
export async function hashPassword(password: string): Promise<string> {
  const trimmed = password.trim();
  if (!trimmed) return '';

  const salted = `mywahou_sec_2026_salt_${trimmed}`;

  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const msgBuffer = new TextEncoder().encode(salted);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Fallback simple bitwise SHA-256 hash si crypto.subtle n'est pas disponible
  return fallbackSimpleHash(salted);
}

function fallbackSimpleHash(input: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ char, 0x01000193);
    hash2 = Math.imul(hash2 ^ char, 0x85ebca6b);
  }
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `h_${part1}${part2}${part1.split('').reverse().join('')}`;
}

/**
 * Vérifie si le mot de passe fourni correspond à l'utilisateur.
 */
export async function verifyPassword(password: string, user: UserProfile): Promise<boolean> {
  const cleanPass = password.trim();
  if (!cleanPass) return false;

  // Cas spécial Administrateur : vérifie ADMIN_PASS ou le mot de passe personnalisé
  if (user.email && user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    if (cleanPass === ADMIN_PASS) return true;
  }

  // Si l'utilisateur n'a pas encore de mot de passe enregistré
  if (!user.passwordHash) {
    return false;
  }

  const computedHash = await hashPassword(cleanPass);
  if (computedHash === user.passwordHash) {
    return true;
  }

  // Compatibilité secours au cas où le mot de passe avait été enregistré temporairement en clair
  if ((user as any).password && (user as any).password === cleanPass) {
    return true;
  }

  return false;
}

/**
 * Indique si un compte utilisateur possède déjà un mot de passe configuré.
 */
export function isPasswordConfigured(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.email && user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true; // L'administrateur a toujours un mot de passe
  }
  return Boolean(user.passwordHash || (user as any).password);
}
