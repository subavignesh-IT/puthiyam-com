import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI is not configured' }, 500);

    const body = await req.json().catch(() => null);
    const imageBase64: string | undefined = body?.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 32) {
      return json({ error: 'A product photo is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: products } = await supabase
      .from('products')
      .select('name, category')
      .eq('is_active', true)
      .limit(400);

    const catalog = (products || []).map((p: { name: string; category: string }) => `${p.name} (${p.category})`);

    const prompt =
      `You match a customer photo to a shop catalog.\n` +
      `Catalog items:\n${catalog.join('\n') || '(empty)'}\n\n` +
      `Reply with ONLY the single best matching catalog item name, exactly as written above and without the category in brackets. ` +
      `If nothing matches, reply with 2-4 plain keywords describing the item in the photo.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Lovable-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`AI gateway failed [${res.status}]: ${details}`);
      return json({ error: 'Image search failed', status: res.status, details }, res.status);
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? '';
    const query = raw.replace(/[`"*\n\r]/g, ' ').replace(/\(.*?\)/g, '').trim().slice(0, 80);
    if (!query) return json({ error: 'Could not recognise the product' }, 422);

    const matched = catalog.some(c => c.toLowerCase().startsWith(query.toLowerCase()));
    return json({ query, matched });
  } catch (e) {
    console.error('image-product-search error:', e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
