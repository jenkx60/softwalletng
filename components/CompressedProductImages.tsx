"use client";

import { useRef, useState, type ChangeEvent } from "react";

const MAX_BYTES = 1_500_000;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export type ImageInputStatus = "idle" | "processing" | "error";

async function asWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob || blob.type !== "image/webp") throw new Error("This browser cannot compress images to WebP.");
  return blob;
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image compression is unavailable in this browser.");

    for (const maxSide of [1600, 1280, 1024]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.68, 0.55]) {
        const blob = await asWebp(canvas, quality);
        if (blob.size <= MAX_BYTES) {
          return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
        }
      }
    }
    throw new Error("One image is still too large after compression. Choose a smaller photo.");
  } finally {
    bitmap.close();
  }
}

export function CompressedProductImages({
  name,
  maxFiles,
  required = false,
  onStatusChange,
}: {
  name: string;
  maxFiles: number;
  required?: boolean;
  onStatusChange: (status: ImageInputStatus) => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const run = useRef(0);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    const currentRun = ++run.current;
    setMessage("");
    setError("");
    if (files.length === 0) {
      onStatusChange("idle");
      return;
    }
    if (files.length > maxFiles || files.some((file) => !ACCEPTED_TYPES.has(file.type))) {
      input.value = "";
      setError(`Choose up to ${maxFiles} JPEG, PNG, or WebP ${maxFiles === 1 ? "image" : "images"}.`);
      onStatusChange("error");
      return;
    }

    onStatusChange("processing");
    try {
      const compressed = await Promise.all(files.map(compressImage));
      if (currentRun !== run.current) return;
      const transfer = new DataTransfer();
      compressed.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      const saved = files.reduce((total, file, index) => total + file.size - compressed[index].size, 0);
      setMessage(`${compressed.length} ${compressed.length === 1 ? "image" : "images"} ready as WebP · ${Math.max(0, Math.round(saved / 1024))} KB saved`);
      onStatusChange("idle");
    } catch (cause) {
      if (currentRun !== run.current) return;
      input.value = "";
      setError(cause instanceof Error ? cause.message : "Could not compress the selected images.");
      onStatusChange("error");
    }
  }

  return <div>
    <input required={required} type="file" name={name} aria-label={maxFiles > 1 ? "Product images" : "Product image"} accept="image/jpeg,image/png,image/webp" multiple={maxFiles > 1} onChange={handleChange} className="mt-2 block w-full text-sm" />
    <p className="mt-1 text-xs text-ink-45">Up to {maxFiles} {maxFiles === 1 ? "image" : "images"} · automatically resized and compressed to WebP.</p>
    {message && <p role="status" className="mt-1 text-xs text-ink-70">{message}</p>}
    {error && <p role="alert" className="mt-1 text-xs text-rust">{error}</p>}
  </div>;
}
