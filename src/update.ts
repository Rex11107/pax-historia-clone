// Aggiornamento dall'app: confronta la versione installata con l'ultima release su GitHub.
// Nell'APK apre il download dell'APK nuovo (Android chiede poi di installarlo); nel browser ricarica la pagina.

import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

declare const __APP_VERSION__: string;
/** versione della build (0.1.<numero di build>, "dev" in locale) */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const REPO = 'Rex11107/pax-historia-clone';
export const APK_URL = `https://github.com/${REPO}/releases/latest/download/regnum-historia.apk`;

export interface Release { tag: string; version: string; notes: string; date: string }

const build = (v: string) => Number(String(v).replace(/^v/, '').split('.').pop()) || 0;

export async function latestRelease(): Promise<Release> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub non risponde (${res.status})`);
  const j = await res.json() as { tag_name: string; body?: string; published_at?: string };
  return { tag: j.tag_name, version: j.tag_name.replace(/^v/, ''), notes: (j.body ?? '').split('\n')[0], date: j.published_at ?? '' };
}

/** true se la release è più recente della versione installata (in locale: sempre false) */
export function isNewer(r: Release): boolean {
  if (APP_VERSION === 'dev') return false;
  return build(r.version) > build(APP_VERSION);
}

export const isNative = () => Capacitor.isNativePlatform();

/** Scarica e installa: nell'APK apre il download nel browser di sistema, nel web ricarica. */
export async function installUpdate() {
  if (isNative()) await AppLauncher.openUrl({ url: APK_URL });
  else location.reload();
}
