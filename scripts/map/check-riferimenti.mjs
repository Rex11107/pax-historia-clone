// Coerenza dei riferimenti tra province: vicini, stretti e piste carovaniere.
//
// Le province sono indicizzate per posizione (id = indice). Togliere o aggiungere una provincia
// a mano sposta tutti gli id successivi, e ogni elenco che ne conserva i numeri (vicini `n`,
// `straits`, `routes`) finisce a puntare alla provincia sbagliata: è successo con le modifiche
// alle oasi dell'8-9 novembre 2026 (Gafsa confinava con Tipperary, le Maldive con Saint-Martin).
// Questi controlli lo intercettano:
//
//   vicini   `n` deve coincidere con le province che condividono un arco, più i legami simbolici
//            delle province senza geometria (Gibilterra, Monaco, Ceuta, Melilla, Fiume)
//   stretti  i due capi devono esistere ed essere entro 2000 km (il più lungo voluto, Chagos-Galle,
//            è di 1742 km)
//   piste    il nome «A – B» deve citare le due province collegate (salvo le piste chiamate con il
//            nome di una città, elencate in check-allow.json sotto `piste`), che non devono già confinare

const KM = (a, b) => {
  const r = Math.PI / 180, dl = (b[0] - a[0]) * r, p1 = a[1] * r, p2 = b[1] * r;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2));
};
const base = (s) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();

export function checkRiferimenti(M, nomiCitta = []) {
  const P = M.provinces;
  const out = [];
  const err = (p, text, ids = [p.id]) => out.push({ id: p.id, text, ids });

  P.forEach((p, i) => { if (p.id !== i) err(p, `id ${p.id} in posizione ${i}`); });

  // vicini attesi dagli archi
  const nb = P.map(() => new Set());
  for (const [a, b] of M.arcSides) if (a != null && b != null && a >= 0 && b >= 0 && a !== b) { nb[a].add(b); nb[b].add(a); }
  const senzaGeo = (p) => !p.arcs || !p.arcs.length;
  for (const p of P) {
    const n = new Set(p.n ?? []);
    for (const q of nb[p.id]) if (!n.has(q)) err(p, `confina con ${P[q].name} ma non lo elenca tra i vicini`, [p.id, q]);
    for (const q of n) {
      if (!P[q]) { err(p, `vicino ${q} inesistente`); continue; }
      if (nb[p.id].has(q)) continue;
      if (senzaGeo(p) || senzaGeo(P[q])) { if (!(P[q].n ?? []).includes(p.id)) err(p, `legame simbolico con ${P[q].name} non reciproco`, [p.id, q]); continue; }
      err(p, `elenca ${P[q].name} tra i vicini senza confinarci`, [p.id, q]);
    }
  }

  // stretti
  for (const [a, b] of M.straits) {
    if (!P[a] || !P[b]) { out.push({ id: P[a] ? a : b, text: `stretto ${a}-${b} verso una provincia inesistente`, ids: [] }); continue; }
    const d = KM(P[a].lonlat, P[b].lonlat);
    if (d > 2000) err(P[a], `stretto con ${P[b].name} lungo ${Math.round(d)} km: riferimento spostato?`, [a, b]);
  }

  // piste
  for (const r of M.routes ?? []) {
    const A = P[r.a], B = P[r.b];
    if (!A || !B) { out.push({ id: A ? r.a : r.b, text: `pista «${r.name}» verso una provincia inesistente`, ids: [] }); continue; }
    if (r.name && !nomiCitta.includes(r.name)) {
      const [x, y] = r.name.split(/\s+–\s+/).map(base);
      const ok = (nome, prov) => base(prov.name) === nome || prov.name.startsWith(nome);
      if (!((ok(x, A) && ok(y, B)) || (ok(x, B) && ok(y, A)))) err(A, `la pista «${r.name}» collega in realtà ${A.name} e ${B.name}`, [r.a, r.b]);
    }
    if (nb[r.a].has(r.b)) err(A, `la pista «${r.name}» unisce due province già confinanti`, [r.a, r.b]);
  }
  return out;
}
