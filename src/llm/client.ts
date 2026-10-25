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

export async function chatJSON(cfg: LLMConfig, messages: ChatMsg[], opts: { model?: string; maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}): Promise<Record<string, unknown>> {
  if (!cfg.apiKey) throw new LLMError('Chiave API mancante: inseriscila nelle Impostazioni.');
  const body = {
    model: opts.model || cfg.model,
    messages,
    response_format: { type: 'json_object' },
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1200,
    stream: false,
  };
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await transport(endpoint(cfg.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
      const raw = await res.text();
      if (res.status === 401 || res.status === 403) throw new LLMError('Chiave API rifiutata dal provider (401/403). Controllala nelle Impostazioni.', res.status);
      if (res.status === 402) throw new LLMError('Credito API esaurito sul conto del provider (402).', res.status);
      if (res.status === 429 || res.status >= 500) { lastErr = new LLMError(`Il provider è occupato (${res.status}), nuovo tentativo…`, res.status); await sleep(1500 * (attempt + 1)); continue; }
      if (res.status >= 400) throw new LLMError(`Errore del provider (${res.status}): ${raw.slice(0, 200)}`, res.status);
      const data = JSON.parse(raw);
      const u = data.usage ?? {};
      usage.calls++;
      usage.promptTokens += u.prompt_tokens ?? 0;
      usage.cachedTokens += u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0;
      usage.completionTokens += u.completion_tokens ?? 0;
      const content: string = data.choices?.[0]?.message?.content ?? '';
      try {
        const obj = parseJSON(content);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, unknown>;
        throw new Error('non è un oggetto');
      } catch {
        lastErr = new LLMError('Il modello ha restituito JSON non valido.');
        body.messages = [...messages, { role: 'assistant', content }, { role: 'user', content: 'La risposta precedente non era JSON valido. Rispondi SOLO con l\'oggetto JSON richiesto.' }];
        continue;
      }
    } catch (e) {
      if (e instanceof LLMError && e.status && e.status < 500 && e.status !== 429) throw e;
      if ((e as Error)?.name === 'AbortError') throw e;
      lastErr = e;
      await sleep(1000 * (attempt + 1));
    }
  }
  if (lastErr instanceof LLMError) throw lastErr;
  throw new LLMError(`Rete non raggiungibile o risposta non valida: ${(lastErr as Error)?.message ?? lastErr}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
