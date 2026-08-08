import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-3.6-flash';

interface RatesBody {
  mode: 'rates';
  products: { id: string; name: string; category?: string | null }[];
}

interface SummaryBody {
  mode: 'summary';
  period: { from: string; to: string };
  gstin?: string | null;
  totals: { bills: number; taxableValue: number; gstAmount: number; total: number };
  byRate: { rate: number; taxableValue: number; gstAmount: number }[];
}

type Body = RatesBody | SummaryBody;

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const callGateway = async (key: string, messages: unknown[], responseFormat?: unknown) => {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Lovable-API-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, ...(responseFormat ? { response_format: responseFormat } : {}) }),
  });
  if (!res.ok) {
    const details = await res.text();
    console.error(`AI gateway failed [${res.status}]: ${details}`);
    throw new Response(JSON.stringify({ error: 'AI request failed', status: res.status, details }), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) return json({ error: 'LOVABLE_API_KEY is not configured' }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    if (body.mode === 'rates') {
      if (!Array.isArray(body.products) || body.products.length === 0) {
        return json({ error: 'products must be a non-empty array' }, 400);
      }
      const list = body.products.slice(0, 60).map(p => ({
        id: String(p.id),
        name: String(p.name || '').slice(0, 120),
        category: p.category ? String(p.category).slice(0, 60) : undefined,
      }));
      const content = await callGateway(key, [
        {
          role: 'system',
          content:
            'You are an Indian GST classification assistant. For each product, suggest the most likely Indian GST rate ' +
            '(one of 0, 5, 12, 18, 28) and a 4-to-8 digit HSN code, with a one-line reason. ' +
            'Reply as JSON: {"suggestions":[{"id","gst_rate","hsn_code","reason"}]}. These are suggestions only.',
        },
        { role: 'user', content: JSON.stringify({ products: list }) },
      ], { type: 'json_object' });
      let parsed: unknown = null;
      try { parsed = JSON.parse(content); } catch { parsed = null; }
      if (!parsed) return json({ error: 'AI returned an unreadable response' }, 502);
      return json(parsed);
    }

    if (body.mode === 'summary') {
      if (!body.totals) return json({ error: 'totals is required' }, 400);
      const content = await callGateway(key, [
        {
          role: 'system',
          content:
            'You are a GST filing assistant for a small Indian retailer. Given the period totals, write a short plain-language ' +
            'filing summary (max 180 words): total sales, taxable value, GST payable split as CGST/SGST for intra-state supply, ' +
            'the rate-wise breakup, and a reminder of what to enter in GSTR-1/GSTR-3B. No markdown tables, no disclaimers longer than one line.',
        },
        { role: 'user', content: JSON.stringify(body) },
      ]);
      return json({ summary: content });
    }

    return json({ error: 'Unknown mode' }, 400);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('gst-assist error:', e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});