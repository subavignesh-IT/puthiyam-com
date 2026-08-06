import { supabase } from '@/integrations/supabase/client';

export interface BillDeliveryResult {
  channel: 'whatsapp' | 'sms' | 'none';
  mediaUrl?: string | null;
  error?: string;
  whatsappError?: string | null;
}

/**
 * Sends the bill image + a thank-you message to the customer's WhatsApp.
 * Falls back to SMS (with the bill link) when the WhatsApp send fails.
 */
export const sendBillToCustomer = async (params: {
  phone: string;
  message: string;
  imageDataUrl?: string | null;
  orderNumber?: string;
}): Promise<BillDeliveryResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-bill-whatsapp', {
      body: {
        phone: params.phone,
        message: params.message,
        imageBase64: params.imageDataUrl || undefined,
        orderNumber: params.orderNumber,
      },
    });
    if (error) {
      console.error('send-bill-whatsapp failed:', error.message);
      return { channel: 'none', error: error.message };
    }
    return (data as BillDeliveryResult) ?? { channel: 'none' };
  } catch (e: any) {
    console.error('send-bill-whatsapp threw:', e);
    return { channel: 'none', error: String(e?.message || e) };
  }
};

export const buildThankYouMessage = (opts: {
  orderNumber: string;
  customerName: string;
  total: number;
  paid: boolean;
}) =>
  `Thank you for shopping with PUTHIYAM PRODUCTS, ${opts.customerName}!\n` +
  `Order: ${opts.orderNumber}\n` +
  `Total: ₹${opts.total.toFixed(2)}\n` +
  `Payment: ${opts.paid ? 'Received — thank you!' : 'Pending (pay on delivery)'}\n` +
  `Your bill is attached. For help call 9361284773.`;

/** Opens a WhatsApp chat with the customer as a manual fallback. */
export const openWhatsAppFallback = (phone: string, text: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return;
  window.open(`https://wa.me/91${digits.slice(-10)}?text=${encodeURIComponent(text)}`, '_blank');
};
