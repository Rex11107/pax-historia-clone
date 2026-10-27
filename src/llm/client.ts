// Client minimale per API compatibili OpenAI (DeepSeek, OpenRouter, ecc.).
// Nell'APK la chiamata passa dall'HTTP nativo di Capacitor (CapacitorHttp sostituisce fetch),
// quindi non ci sono problemi di CORS; nel browser dipende dal provider.

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** modello per gli agenti-nazione (facoltativo, es. deepseek-v4-pro) */
  diplomacyModel?: string;
}

export const DEFAULT_CONFIG: Omit<LLMConfig, 'apiKey'> = {
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  diplomacyModel: '',
};

export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }

export interface Usage { calls: number; promptTokens: number; cachedTokens: number; completionTokens: number }
export const usage: Usage = { calls: 0, promptTokens: 0, cachedTokens: 0, completionTokens: 0 };

export class LLMError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

export type Transport = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ status: number; text: () => Promise<string> }>;

let transport: Transport = (url, init) => fetch(url, init);
/** Per i test: sostituisce la rete. */
export function setTransport(t: Transport) { transport = t; }

function endpoint(baseUrl: string) {
  const b = baseUrl.trim().replace(/\/+$/, '');
  return /\/chat\/completions$/.test(b) ? b : `${b}/chat/completions`;
}

/** Estrae un oggetto JSON da una risposta (tollera ```json, testo attorno, virgole finali). */
export function parseJSON(text: string): unknown {
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try { return JSON.parse(t); } catch { /* riparazione */ }
  const repaired = t.replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"');
  return JSON.parse(repaired);
}

/** Il provider: OpenRouter, DeepSeek diretto o altro compatibile OpenAI. */
function providerOf(baseUrl: string): 'openrouter' | 'deepseek' | 'other' {
  if (/openrouter\.ai/i.test(baseUrl)) return 'openrouter';
  if (/deepseek\.com/i.test(baseUrl)) return 'deepseek';
  return 'other';
}

// I modelli "che ragionano" (DeepSeek V4, R1…) spendono i token del limite in ragionamento prima di
// rispondere: con un limite basso il contenuto arriva vuoto e sembra che l'AI "non collabori".
// Qui il ragionamento si riduce dove il provider lo permette, il limite ha un margine,
// e se il JSON finisce nel campo del ragionamento lo si recupera da lì.
const REASONING_HEADROOM = 2500;

/** Estrae il testo utile da una risposta: contenuto, oppure ragionamento se il contenuto è vuoto. */
export function messageText(data: unknown): { text: string; finish: string } {
  const choice = (data as { choices?: { message?: Record<string, unknown>; finish_reason?: string }[] })?.choices?.[0];
  const m = choice?.message ?? {};
  let text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? (m.content as { text?: string }[]).map((p) => p.text ?? '').join('') : '';
  if (!text.trim()) {
    const r = m.reasoning ?? m.reasoning_content;
    if (typeof r === 'string' && r.includes('{')) text = r;
  }
  return { text, finish: choice?.finish_reason ?? '' };
}

type UsageRaw = { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };

export async function chatJSON(cfg: LLMConfig, messages: ChatMsg[], opts: { model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}): Promise<Record<string, unknown>> {
  if (!cfg.apiKey) throw new LLMError('Chiave API mancante: inseriscila nelle Impostazioni.');
  const provider = providerOf(cfg.baseUrl);
  const body: Record<string, unknown> = {
    model: (opts.model || cfg.model).trim(),
    messages,
    response_format: { type: 'json_object' },
    temperature: opts.temperature ?? 0.7,
    max_tokens: (opts.maxTokens ?? 1200) + REASONING_HEADROOM,
    stream: false,
  };
  if (provider === 'openrouter') body.reasoning = { effort: 'low', exclude: true };
  if (provider === 'deepseek') body.thinking = { type: 'disabled' };
  let lastErr: unknown;
  let lastFinish = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await transport(endpoint(cfg.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey.trim()}` },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
      const raw = await res.text();
      if (res.status === 401 || res.status === 403) throw new LLMError('Chiave API rifiutata dal provider (401/403). Controllala nelle Impostazioni.', res.status);
      if (res.status === 402) throw new LLMError('Credito API esaurito sul conto del provider (402).', res.status);
      if (res.status === 404 && /model|endpoint/i.test(raw)) throw new LLMError(`Il provider non trova il modello "${String(body.model)}" (404). Controlla il nome nelle Impostazioni.`, 404);
      if (res.status === 429 || res.status >= 500) { lastErr = new LLMError(`Il provider è occupato (${res.status}), nuovo tentativo…`, res.status); await sleep(1500 * (attempt + 1)); continue; }
      if (res.status === 400 && (body.reasoning || body.thinking || body.response_format)) {
        // parametro non supportato da questo modello o provider: si riprova senza (prima il ragionamento, poi il formato JSON)
        if (body.reasoning || body.thinking) { delete body.reasoning; delete body.thinking; } else delete body.response_format;
        lastErr = new LLMError(`Errore del provider (400): ${raw.slice(0, 200)}`, 400);
        continue;
      }
      if (res.status >= 400) throw new LLMError(`Errore del provider (${res.status}): ${raw.slice(0, 200)}`, res.status);
      let data: unknown;
      try { data = JSON.parse(raw); } catch { lastErr = new LLMError(`Risposta non leggibile dal provider: ${raw.slice(0, 120)}`); continue; }
      const err = (data as { error?: { message?: string } }).error;
      if (err) { lastErr = new LLMError(`Errore del provider: ${err.message ?? JSON.stringify(err).slice(0, 160)}`); await sleep(1000 * (attempt + 1)); continue; }
      const u: UsageRaw = (data as { usage?: UsageRaw }).usage ?? {};
      usage.calls++;
      usage.promptTokens += u.prompt_tokens ?? 0;
      usage.cachedTokens += u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0;
      usage.completionTokens += u.completion_tokens ?? 0;
      const { text: content, finish } = messageText(data);
      lastFinish = finish;
      try {
        const obj = parseJSON(content);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>;
        throw new Error('non è un oggetto');
      } catch {
        if (!content.trim() && finish === 'length') {
          // tutto il limite speso nel ragionamento: più spazio al prossimo tentativo
          body.max_tokens = Number(body.max_tokens) * 2;
          lastErr = new LLMError('Il modello ha esaurito i token ragionando senza rispondere: prova un modello senza ragionamento o riprova.');
          continue;
        }
        lastErr = new LLMError(content.trim() ? 'Il modello ha restituito JSON non valido.' : 'Il modello ha restituito una risposta vuota.');
        body.messages = [...messages, { role: 'assistant', content: content || '(vuoto)' }, { role: 'user', content: 'La risposta precedente non era JSON valido. Rispondi SOLO con l\'oggetto JSON richiesto.' }];
        continue;
      }
    } catch (e) {
      if (e instanceof LLMError && e.status && e.status < 500 && e.status !== 429 && e.status !== 400) throw e;
      if ((e as Error)?.name === 'AbortError') throw e;
      if (e instanceof TypeError) lastErr = new LLMError(`Rete non raggiungibile (${e.message}). Nel browser può essere il blocco CORS del provider: OpenRouter lo permette, altri no.`);
      else lastErr = e;
      await sleep(1000 * (attempt + 1));
    }
  }
  if (lastErr instanceof LLMError) throw lastErr;
  throw new LLMError(`Rete non raggiungibile o risposta non valida: ${(lastErr as Error)?.message ?? lastErr}${lastFinish ? ` (${lastFinish})` : ''}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
