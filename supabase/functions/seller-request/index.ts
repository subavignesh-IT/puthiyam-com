import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const required = ['user_id', 'full_name', 'email'];
    for (const k of required) {
      if (!body?.[k] || typeof body[k] !== 'string') {
        return new Response(JSON.stringify({ error: `Missing field: ${k}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const str = (v: unknown, max = 300) =>
      typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const row = {
      user_id: body.user_id,
      full_name: str(body.full_name, 120),
      email: str(body.email, 200),
      phone: str(body.phone, 20),
      shop_name: str(body.shop_name, 150),
      company_name: str(body.company_name, 150),
      gstin: str(body.gstin, 20),
      business_address: str(body.business_address, 400),
      city: str(body.city, 100),
      pincode: str(body.pincode, 10),
      status: 'pending',
    };

    // Remove an older pending request from the same user, then insert fresh
    await admin.from('seller_requests').delete().eq('user_id', row.user_id).eq('status', 'pending');

    const { error } = await admin.from('seller_requests').insert(row);
    if (error) throw error;

    // Keep the seller's profile in sync with the company details
    await admin
      .from('profiles')
      .update({
        full_name: row.full_name,
        phone: row.phone,
        company_name: row.company_name,
        gstin: row.gstin,
        business_address: row.business_address,
        city: row.city,
        pincode: row.pincode,
      })
      .eq('user_id', row.user_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});