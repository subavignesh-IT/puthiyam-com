import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Download, FileText, Printer, Receipt, Bluetooth, Share2 } from 'lucide-react';
import { downloadA4Pdf, printImageA4, sharePdf } from '@/lib/pdf';
import {
  ThermalReceipt,
  bluetoothPrintingSupported,
  printThermalBluetooth,
  printThermalReceipt,
} from '@/lib/thermal';

interface Props {
  /** Renders the invoice DOM to a JPEG data URL. */
  getJpeg: () => Promise<string>;
  filename: string;
  receipt?: ThermalReceipt | null;
  shareText?: string;
  compact?: boolean;
}

const InvoiceActions: React.FC<Props> = ({ getJpeg, filename, receipt, shareText, compact }) => {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try { await fn(); }
    catch (e: any) { toast({ title: 'Could not complete', description: String(e?.message || e), variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const jpg = () => run('jpg', async () => {
    const url = await getJpeg();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.jpg`;
    a.click();
    toast({ title: 'Bill image downloaded' });
  });

  const pdf = () => run('pdf', async () => {
    await downloadA4Pdf(await getJpeg(), filename);
    toast({ title: 'PDF downloaded', description: 'A4 invoice ready to print' });
  });

  const share = () => run('share', async () => {
    const res = await sharePdf(await getJpeg(), filename, shareText);
    toast({ title: res === 'shared' ? 'PDF shared' : 'PDF downloaded' });
  });

  const printA4 = () => run('a4', async () => {
    printImageA4(await getJpeg(), filename);
  });

  const thermal = () => run('thermal', async () => {
    if (!receipt) return;
    const ok = printThermalReceipt(receipt);
    if (!ok) toast({ title: 'Allow pop-ups to print the receipt', variant: 'destructive' });
  });

  const bt = () => run('bt', async () => {
    if (!receipt) return;
    await printThermalBluetooth(receipt);
    toast({ title: 'Sent to Bluetooth printer' });
  });

  const size = compact ? 'sm' : 'default';

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size={size} onClick={jpg} disabled={!!busy}>
        <Download className="w-4 h-4 mr-1" /> JPG
      </Button>
      <Button variant="outline" size={size} onClick={pdf} disabled={!!busy}>
        <FileText className="w-4 h-4 mr-1" /> PDF
      </Button>
      <Button variant="outline" size={size} onClick={share} disabled={!!busy}>
        <Share2 className="w-4 h-4 mr-1" /> Share PDF
      </Button>
      <Button variant="outline" size={size} onClick={printA4} disabled={!!busy}>
        <Printer className="w-4 h-4 mr-1" /> Print A4
      </Button>
      {receipt && (
        <Button variant="outline" size={size} onClick={thermal} disabled={!!busy}>
          <Receipt className="w-4 h-4 mr-1" /> Thermal
        </Button>
      )}
      {receipt && bluetoothPrintingSupported() && (
        <Button variant="outline" size={size} onClick={bt} disabled={!!busy}>
          <Bluetooth className="w-4 h-4 mr-1" /> {busy === 'bt' ? 'Sending…' : 'Bluetooth'}
        </Button>
      )}
    </div>
  );
};

export default InvoiceActions;