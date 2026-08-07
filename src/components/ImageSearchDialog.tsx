import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, ScanLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import BarcodeScannerDialog from '@/components/BarcodeScannerDialog';

interface Props {
  /** Called with the search text resolved from the photo or scanned code. */
  onResult: (query: string) => void;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read the image'));
    fr.readAsDataURL(file);
  });

const ImageSearchDialog: React.FC<Props> = ({ onResult }) => {
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use a photo under 6 MB.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      setPreview(dataUrl);
      const { data, error } = await supabase.functions.invoke('image-product-search', {
        body: { imageBase64: dataUrl },
      });
      if (error) throw error;
      const query = (data as { query?: string })?.query;
      if (!query) throw new Error('No match found');
      onResult(query);
      setOpen(false);
      setPreview(null);
      toast({ title: 'Searching by photo', description: `Showing results for "${query}"` });
    } catch (e) {
      toast({
        title: 'Could not identify the product',
        description: 'Try a clearer photo, or scan the barcode instead.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search by photo or barcode"
        onClick={() => setOpen(true)}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
      >
        <Camera className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPreview(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Search by image
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {preview && (
              <img src={preview} alt="Selected product photo" className="w-full h-40 object-cover rounded-lg" />
            )}
            {busy ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Identifying product…
              </div>
            ) : (
              <div className="grid gap-2">
                <Button className="h-12" onClick={() => cameraRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-2" /> Take a photo
                </Button>
                <Button variant="outline" className="h-12" onClick={() => galleryRef.current?.click()}>
                  <ImagePlus className="w-4 h-4 mr-2" /> Upload from gallery
                </Button>
                <Button variant="outline" className="h-12" onClick={() => { setOpen(false); setScanOpen(true); }}>
                  <ScanLine className="w-4 h-4 mr-2" /> Scan barcode / QR
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              We match your photo against our catalogue and show the closest products.
            </p>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScan={(code) => { onResult(code.trim()); setScanOpen(false); }}
      />
    </>
  );
};

export default ImageSearchDialog;
