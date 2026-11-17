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

/**
 * Confronta due versioni numero per numero ("0.2.0" > "0.1.84"): positivo se `a` è più recente. Prima si guardava
 * solo l'ultimo numero, e un passaggio a 0.2.0 non sarebbe mai stato proposto (corte 10, capo 3).
 */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => String(v).replace(/^v/, '').split('.').map((x) => Number(x) || 0);
  const pa = parts(a), pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export async function latestRelease(): Promise<Release> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub non risponde (${res.status})`);
  const j = await res.json() as { tag_name: string; body?: string; published_at?: string };
  return { tag: j.tag_name, version: j.tag_name.replace(/^v/, ''), notes: (j.body ?? '').split('\n')[0], date: j.published_at ?? '' };
}

/** true se la release è più recente della versione installata (in locale: sempre false) */
export function isNewer(r: Release): boolean {
  if (APP_VERSION === 'dev') return false;
  return compareVersions(r.version, APP_VERSION) > 0;
}

export const isNative = () => Capacitor.isNativePlatform();

/** Scarica e installa: nell'APK apre il download nel browser di sistema, nel web ricarica. */
/**
 * Installa l'aggiornamento. Nel browser ricarica la pagina: `beforeReload` salva prima la partita, altrimenti il
 * turno in corso andava perso (corte 10, capo 4). Nell'APK apre solo il download: l'app resta aperta.
 */
export async function installUpdate(beforeReload?: () => Promise<void>) {
  if (isNative()) { await AppLauncher.openUrl({ url: APK_URL }); return; }
  // se il salvataggio fallisce l'errore risale e la pagina non si ricarica: decide il giocatore
  if (beforeReload) await beforeReload();
  location.reload();
}
