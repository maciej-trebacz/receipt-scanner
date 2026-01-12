"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Image01Icon,
  Loading03Icon,
  Cancel01Icon,
  Tick02Icon,
  Invoice01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { createImagePreview } from "@/lib/image-utils";

interface ReceiptCaptureProps {
  onCapture?: (file: File) => void;
  onScan: (file: File) => void;
  isLoading?: boolean;
}

export function ReceiptCapture({
  onCapture,
  onScan,
  isLoading = false,
}: ReceiptCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoadingPreview(true);
    onCapture?.(file);

    try {
      const preview = await createImagePreview(file);
      setPreview(preview);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // Clear preview after upload completes (isLoading goes from true to false)
  const wasLoading = useRef(false);
  useEffect(() => {
    if (wasLoading.current && !isLoading) {
      handleClear();
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  const handleConfirm = () => {
    if (selectedFile) {
      onScan(selectedFile);
    }
  };

  return (
    <div className="w-full">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Capture from camera"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select from gallery"
      />

      {!preview ? (
        <div className="glass-card p-8 flex flex-col items-center text-center">
          {isLoadingPreview ? (
            <>
              <div className="size-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <HugeiconsIcon icon={Loading03Icon} className="size-12 animate-spin" />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Loading preview...</h2>
              <p className="text-muted-foreground mb-8 max-w-[240px]">
                Converting image for preview
              </p>
            </>
          ) : (
            <>
              <div className="size-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-6 animate-float">
                <HugeiconsIcon icon={Invoice01Icon} className="size-12" />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Ready to scan?</h2>
              <p className="text-muted-foreground mb-8 max-w-[240px]">
                Take a photo or upload an image of your receipt.
              </p>
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <HugeiconsIcon icon={Camera01Icon} className="size-6 stroke-[2.5]" />
                  Scan with Camera
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full h-14 text-foreground font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <HugeiconsIcon icon={Image01Icon} className="size-6" />
                  Select from Gallery
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl glass shadow-2xl">
            <img
              src={preview}
              alt="Receipt preview"
              className={cn(
                "h-full w-full object-contain transition-all duration-700",
                isLoading && "opacity-50 blur-sm scale-95"
              )}
            />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="relative size-24 mb-6">
                  <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-25" />
                  <div className="absolute inset-2 border-4 border-primary rounded-full animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <HugeiconsIcon icon={Loading03Icon} className="size-10 text-primary animate-spin" />
                  </div>
                </div>
                <h3 className="text-primary font-black uppercase tracking-[0.3em] text-glow">Analyzing</h3>
                <p className="text-white/60 text-xs mt-2 font-medium">Extracting data with AI...</p>
              </div>
            )}

            {/* Animated Scanning Line */}
            {isLoading && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_var(--primary)] animate-[scan_2s_linear_infinite]"
                style={{
                  animationName: 'scan'
                }}
              />
            )}
            <style dangerouslySetInnerHTML={{
              __html: `
              @keyframes scan {
                0% { top: 0% }
                100% { top: 100% }
              }
            `}} />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleClear}
              className="flex-1 h-14 glass text-foreground font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <HugeiconsIcon icon={Loading03Icon} className="size-5 animate-spin" />
              ) : (
                <HugeiconsIcon icon={Tick02Icon} className="size-5 stroke-[2.5]" />
              )}
              {isLoading ? "Process..." : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
