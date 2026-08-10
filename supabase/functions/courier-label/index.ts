import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    const body = await req.json().catch(() => ({}));
    const address = typeof body?.address === 'string' ? body.address.slice(0, 800) : '';
    const name = typeof body?.name === 'string' ? body.name.slice(0, 120) : '';
    const phone = typeof body?.phone === 'string' ? body.phone.slice(0, 20) : '';

    if (!address.trim()) {
      return new Response(JSON.stringify({ error: 'address is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!key) {
      return new Response(JSON.stringify({ lines: address.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [
          {
            role: 'system',
            content:
              'You format Indian courier shipping addresses. Return ONLY compact JSON of the shape {"lines":["..."]} with 2 to 5 short postal lines, proper capitalisation, area, city, district and PIN code on the last line. Never invent details that are not present.',
          },
          { role: 'user', content: `Recipient: ${name}\nPhone: ${phone}\nAddress: ${address}` },
        ],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`AI gateway failed [${res.status}]: ${errorBody}`);
      return new Response(JSON.stringify({ error: 'AI request failed', status: res.status, details: errorBody }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? '';
    let lines: string[] = [];
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { lines = JSON.parse(match[0])?.lines ?? []; } catch { /* fall through */ }
    }
    if (!Array.isArray(lines) || !lines.length) {
      lines = address.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
    }

    return new Response(JSON.stringify({ lines: lines.map(String).slice(0, 6) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('courier-label error', e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
