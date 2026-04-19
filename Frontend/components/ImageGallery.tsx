"use client";

import Image from "next/image";
import { ImageItem } from "@/lib/types";

type ImageGalleryProps = {
  images: ImageItem[];
  onRegenerate: () => Promise<void>;
  loading: boolean;
};

export default function ImageGallery({ images, onRegenerate, loading }: ImageGalleryProps) {
  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slatebrand">Generated Images</h2>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
        >
          Regenerate
        </button>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-slate-500">No images available yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {images.map((image) => (
            <figure key={`${image.heading}-${image.url}`} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="relative h-44 w-full overflow-hidden rounded-lg bg-slate-100">
                <Image src={image.url} alt={image.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
              <figcaption className="mt-2 space-y-1">
                <p className="text-sm font-semibold text-slate-700">{image.heading}</p>
                <p className="text-xs text-slate-500">Alt: {image.alt}</p>
                <p className="text-xs text-slate-500">Caption: {image.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
