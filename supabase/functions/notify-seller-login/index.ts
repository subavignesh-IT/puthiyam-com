import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'
const ADMIN_NUMBER = '+919361284773'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only notify for sellers / admins
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const isSeller = (roles || []).some((r: { role: string }) => r.role === 'seller' || r.role === 'admin')
    if (!isSeller) {
      return new Response(JSON.stringify({ success: true, skipped: 'not_a_seller' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', user.id)
      .maybeSingle()

    const sellerName = profile?.full_name || user.email || 'Unknown seller'
    const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

    const lovableKey = Deno.env.get('LOVABLE_API_KEY')
    const twilioKey = Deno.env.get('TWILIO_API_KEY')
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')
    if (!lovableKey || !twilioKey || !fromNumber) {
      console.error('Twilio not configured')
      return new Response(JSON.stringify({ error: 'Twilio not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = `PUTHIYAM PRODUCTS — Seller sign-in\nName: ${sellerName}\nEmail: ${user.email ?? '-'}\nPhone: ${profile?.phone ?? '-'}\nTime: ${when} IST`

    const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': twilioKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `whatsapp:${ADMIN_NUMBER}`,
        From: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
        Body: body,
      }),
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      console.error(`Twilio WhatsApp failed [${resp.status}]:`, JSON.stringify(data))
      // Fallback to SMS so the alert still lands
      const smsResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': twilioKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: ADMIN_NUMBER,
          From: fromNumber.replace('whatsapp:', ''),
          Body: body,
        }),
      })
      const smsData = await smsResp.json().catch(() => ({}))
      if (!smsResp.ok) {
        return new Response(
          JSON.stringify({ error: 'Notification failed', status: smsResp.status, details: smsData }),
          { status: smsResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify({ success: true, channel: 'sms', sid: smsData?.sid }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, channel: 'whatsapp', sid: data?.sid }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('notify-seller-login error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})