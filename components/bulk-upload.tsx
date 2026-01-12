"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload01Icon,
  Loading03Icon,
  Tick02Icon,
  Cancel01Icon,
  Image01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createImagePreview } from "@/lib/image-utils";

interface QueuedReceipt {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  storeName?: string | null;
  total?: number;
  errorMessage?: string | null;
  imagePath?: string;
}

interface BulkUploadProps {
  onComplete?: () => void;
  onClose?: () => void;
}

export function BulkUpload({ onComplete, onClose }: BulkUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<number, string>>(new Map());
  const [queued, setQueued] = useState<QueuedReceipt[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileIdCounter = useRef(0);
  const [fileIds, setFileIds] = useState<number[]>([]);

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validExts = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const validFiles = Array.from(newFiles).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext && validExts.includes(ext);
    });

    // Assign IDs and generate previews
    const newIds: number[] = [];
    for (const file of validFiles) {
      const id = fileIdCounter.current++;
      newIds.push(id);

      createImagePreview(file).then((preview) => {
        setPreviews((prev) => new Map(prev).set(id, preview));
      });
    }

    setFileIds((prev) => [...prev, ...newIds]);
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    const idToRemove = fileIds[index];
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileIds((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const next = new Map(prev);
      next.delete(idToRemove);
      return next;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const allQueued: QueuedReceipt[] = [];
    const filesToUpload = [...files];

    setFiles([]);
    setFileIds([]);
    setPreviews(new Map());

    // Upload files sequentially to avoid payload size limits
    for (const file of filesToUpload) {
      const formData = new FormData();
      formData.append("files", file);

      try {
        const res = await fetch("/api/receipts/queue", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Upload failed" }));
          toast.error(`Failed to upload ${file.name}`, {
            description: error.error || error.message || "Upload failed",
          });
          continue;
        }

        const data = await res.json();
        const receipt = data.receipts[0];

        const queued: QueuedReceipt = {
          id: receipt.id,
          filename: receipt.filename,
          status: "pending",
          imagePath: receipt.imagePath,
        };

        allQueued.push(queued);
        setQueued([...allQueued]);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (allQueued.length > 0) {
      // Start listening for status updates
      pollStatus(allQueued.map((r) => r.id));
    } else {
      setIsUploading(false);
    }
  };

  const pollStatus = useCallback(
    async (ids: string[]) => {
      const poll = async () => {
        try {
          const res = await fetch("/api/receipts/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });

          if (!res.ok) return;

          const updates = await res.json();

          setQueued((prev) =>
            prev.map((r) => {
              const update = updates.find((u: any) => u.id === r.id);
              return update ? { ...r, ...update } : r;
            })
          );

          const allDone = updates.every(
            (u: any) => u.status === "completed" || u.status === "failed"
          );

          if (allDone) {
            setIsUploading(false);
            onComplete?.();
          } else {
            setTimeout(poll, 1500);
          }
        } catch {
          setIsUploading(false);
          onComplete?.();
        }
      };

      poll();
    },
    [onComplete]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const allCompleted =
    queued.length > 0 &&
    queued.every((r) => r.status === "completed" || r.status === "failed");

  const completedCount = queued.filter((r) => r.status === "completed").length;
  const failedCount = queued.filter((r) => r.status === "failed").length;

  // Show queued receipts status
  if (queued.length > 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {allCompleted ? "Upload Complete" : "Processing Receipts..."}
          </h3>
          {allCompleted && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>

        {allCompleted && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 text-primary text-sm">
            {completedCount} receipt{completedCount !== 1 ? "s" : ""} processed
            {failedCount > 0 && (
              <span className="text-destructive">
                , {failedCount} failed
              </span>
            )}
          </div>
        )}

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {queued.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
            >
              {receipt.imagePath && (
                <img
                  src={`/api/image/${receipt.imagePath}`}
                  alt=""
                  className="size-12 object-cover rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {receipt.status === "completed"
                    ? receipt.storeName || "Unknown store"
                    : receipt.status === "failed"
                    ? "Failed"
                    : "Processing..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {receipt.status === "pending" && "Queued"}
                  {receipt.status === "processing" && "Analyzing with AI..."}
                  {receipt.status === "completed" &&
                    receipt.total !== undefined &&
                    `${receipt.total.toFixed(2)} PLN`}
                  {receipt.status === "failed" &&
                    (receipt.errorMessage?.slice(0, 40) || "Processing failed")}
                </p>
              </div>
              <div className="shrink-0">
                {receipt.status === "pending" && (
                  <div className="size-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <div className="size-2 rounded-full bg-amber-500" />
                  </div>
                )}
                {receipt.status === "processing" && (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="size-5 text-blue-500 animate-spin"
                  />
                )}
                {receipt.status === "completed" && (
                  <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      className="size-4 text-green-500"
                    />
                  </div>
                )}
                {receipt.status === "failed" && (
                  <div className="size-6 rounded-full bg-destructive/20 flex items-center justify-center">
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      className="size-4 text-destructive"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Bulk Upload</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon icon={Upload01Icon} className="size-8" />
        </div>
        <p className="font-bold">Drop receipt images here</p>
        <p className="text-sm text-muted-foreground mt-1">
          or click to select files
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supports JPEG, PNG, WebP, HEIC
        </p>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
          <div className="grid grid-cols-4 gap-2">
            {fileIds.map((id, index) => {
              const preview = previews.get(id);
              return (
                <div key={id} className="relative group">
                  {preview ? (
                    <img
                      src={preview}
                      alt=""
                      className="aspect-square object-cover rounded-lg"
                    />
                  ) : (
                    <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center">
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        className="size-6 text-muted-foreground animate-spin"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <Button
          className="w-full mt-4"
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} className="size-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Upload01Icon} className="size-4 mr-2" />
              Process {files.length} Receipt{files.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
