"use client";

import { useState } from "react";

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

interface EventGalleryProps {
  eventId: string;
  images: GalleryImage[];
}

export function EventGallery({ eventId, images: initialImages }: EventGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const res = await fetch(`/api/events/${eventId}/gallery`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setImages((prev) => [...data.data, ...prev]);
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-lg bg-[#7A3A50] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6A2A40]">
          {isUploading ? "Téléchargement..." : "📷 Ajouter des photos"}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>
        <span className="text-xs text-gray-400">
          {images.length} photo{images.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {images.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <span className="text-4xl">📷</span>
          <p className="mt-3 text-sm text-gray-500">Aucune photo encore</p>
          <p className="text-xs text-gray-400">
            Ajoutez vos premières photos de l&apos;événement
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.caption || "Photo"}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage.url}
            alt={selectedImage.caption || "Photo"}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
