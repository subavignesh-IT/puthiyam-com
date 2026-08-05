import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (decoded: string) => void;
}

const REGION_ID = 'pos-barcode-region';

const BarcodeScannerDialog: React.FC<Props> = ({ open, onOpenChange, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    const start = async () => {
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled) return;
      try {
        const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 180 } },
          (decodedText) => {
            onScan(decodedText);
            onOpenChange(false);
          },
          () => {},
        );
      } catch (e: unknown) {
        setError(
          e instanceof Error
            ? e.message
            : 'Camera not available. Check browser permissions.',
        );
      }
    };
    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> Scan Barcode / QR
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div id={REGION_ID} className="w-full rounded-lg overflow-hidden bg-muted min-h-[220px]" />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Point the camera at the product barcode or QR code.
            </p>
          )}
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerDialog;