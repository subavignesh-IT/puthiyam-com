import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

const normalizePhone = (raw: string) => {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { phone, message, imageBase64, fileName, orderNumber } = body ?? {};

    const to = normalizePhone(String(phone ?? ''));
    if (!to || to.length < 11) {
      return new Response(JSON.stringify({ error: 'A valid customer phone number is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const text = String(message ?? '').slice(0, 1500) || `Your PUTHIYAM bill ${orderNumber ?? ''}`;

    // 1. Upload the bill image (if provided) and create a shareable signed URL
    let mediaUrl: string | null = null;
    if (typeof imageBase64 === 'string' && imageBase64.length > 100) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const clean = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
        const path = `bills/${orderNumber || Date.now()}-${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('order-bills')
          .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from('order-bills')
          .createSignedUrl(path, 60 * 60 * 24 * 30);
        mediaUrl = signed?.signedUrl ?? null;
      } catch (e) {
        console.error('Bill upload failed:', e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const smsFrom = Deno.env.get('TWILIO_FROM_NUMBER') || '';
    const waFrom = Deno.env.get('TWILIO_WHATSAPP_FROM') || (smsFrom ? `whatsapp:${smsFrom}` : '');

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return new Response(
        JSON.stringify({ channel: 'none', mediaUrl, error: 'Messaging is not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const send = async (params: Record<string, string>) => {
      const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TWILIO_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(params),
      });
      const raw = await res.text();
      return { ok: res.ok, status: res.status, raw };
    };

    // 2. Try WhatsApp (with the bill image as media)
    let whatsappError: string | null = null;
    if (waFrom) {
      const waParams: Record<string, string> = {
        To: `whatsapp:${to}`,
        From: waFrom.startsWith('whatsapp:') ? waFrom : `whatsapp:${waFrom}`,
        Body: text,
      };
      if (mediaUrl) waParams.MediaUrl = mediaUrl;
      const wa = await send(waParams);
      if (wa.ok) {
        return new Response(JSON.stringify({ channel: 'whatsapp', mediaUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      whatsappError = `[${wa.status}]: ${wa.raw}`;
      console.error('WhatsApp send failed', whatsappError);
    } else {
      whatsappError = 'No WhatsApp sender configured';
    }

    // 3. SMS fallback with the bill link
    if (smsFrom) {
      const smsBody = mediaUrl ? `${text}\nBill: ${mediaUrl}` : text;
      const sms = await send({ To: to, From: smsFrom, Body: smsBody.slice(0, 1500) });
      if (sms.ok) {
        return new Response(JSON.stringify({ channel: 'sms', mediaUrl, whatsappError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('SMS fallback failed', sms.status, sms.raw);
      return new Response(
        JSON.stringify({ channel: 'none', mediaUrl, whatsappError, error: `SMS failed [${sms.status}]: ${sms.raw}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ channel: 'none', mediaUrl, error: whatsappError }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-bill-whatsapp error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
