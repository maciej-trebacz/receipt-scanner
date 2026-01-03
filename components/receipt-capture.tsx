"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Image01Icon,
  Loading03Icon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

interface ReceiptCaptureProps {
  onCapture: (file: File) => void;
  onScan: () => void;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
    onCapture(file);
  };

  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onScan();
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
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
          // Capture buttons
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Scan a receipt to get started
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 h-14"
                size="lg"
              >
                <HugeiconsIcon icon={Camera01Icon} className="size-5 mr-2" />
                Camera
              </Button>
              <Button
                onClick={() => galleryInputRef.current?.click()}
                variant="outline"
                className="flex-1 h-14"
                size="lg"
              >
                <HugeiconsIcon icon={Image01Icon} className="size-5 mr-2" />
                Gallery
              </Button>
            </div>
          </div>
        ) : (
          // Preview with actions
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
              <img
                src={preview}
                alt="Receipt preview"
                className="h-full w-full object-contain"
              />
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <HugeiconsIcon icon={Loading03Icon} className="size-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Scanning receipt...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <HugeiconsIcon icon={Loading03Icon} className="size-4 mr-2 animate-spin" />
                ) : (
                  <HugeiconsIcon icon={Tick02Icon} className="size-4 mr-2" />
                )}
                {isLoading ? "Scanning..." : "Scan"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
