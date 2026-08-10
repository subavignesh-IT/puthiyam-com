import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanLine, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (decoded: string) => void;
  /** Keeps the camera running after a detection so several products can be scanned in a row. */
  continuous?: boolean;
}

const REGION_ID = 'pos-barcode-region';
const DUPLICATE_WINDOW_MS = 1500;

const BarcodeScannerDialog: React.FC<Props> = ({ open, onOpenChange, onScan, continuous = true }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setScanned([]);
    lastScanRef.current = { code: '', at: 0 };

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
            const code = decodedText.trim();
            const now = Date.now();
            const last = lastScanRef.current;
            if (last.code === code && now - last.at < DUPLICATE_WINDOW_MS) return;
            lastScanRef.current = { code, at: now };
            onScanRef.current(code);
            setScanned((prev) => [code, ...prev].slice(0, 12));
            setFlash(true);
            setTimeout(() => setFlash(false), 260);
            try { navigator.vibrate?.(40); } catch { /* not supported */ }
            if (!continuousRef.current) onOpenChangeRef.current(false);
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
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> Scan Barcode / QR
            {scanned.length > 0 && <Badge variant="secondary">{scanned.length} scanned</Badge>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <div id={REGION_ID} className="w-full rounded-lg overflow-hidden bg-muted min-h-[220px]" />
            {flash && (
              <div className="absolute inset-0 rounded-lg bg-primary/30 flex items-center justify-center pointer-events-none animate-in fade-in duration-100">
                <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
              </div>
            )}
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Keep scanning — the camera stays open until you press <strong>Done</strong>.
            </p>
          )}
          {scanned.length > 0 && (
            <div className="max-h-24 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1">
              {scanned.map((c, i) => (
                <p key={`${c}-${i}`} className="text-xs font-mono truncate">{c}</p>
              ))}
            </div>
          )}
          <Button className="w-full h-11" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerDialog;
