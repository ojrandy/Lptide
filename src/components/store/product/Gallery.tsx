"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

/** Product image with previous/next arrows and thumbnails when there is more than one image. */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const many = images.length > 1;
  const go = (d: 1 | -1) => setI((n) => (n + d + images.length) % images.length);

  return (
    <div className="product-gallery">
      <div className="product-hero-image">
        {images[i] && <Image src={images[i]} alt={alt} width={800} height={800} sizes="(max-width: 760px) 100vw, 480px" priority />}
        {many && (
          <>
            <button type="button" className="product-gallery-arrow product-gallery-arrow--previous" aria-label="Previous image" onClick={() => go(-1)}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" className="product-gallery-arrow product-gallery-arrow--next" aria-label="Next image" onClick={() => go(1)}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <span className="product-gallery-counter">
              {i + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {many && (
        <div className="product-image-thumbnails">
          {images.map((src, n) => (
            <button
              key={src}
              type="button"
              className={`product-image-thumbnail${n === i ? " is-active" : ""}`}
              aria-label={`Show image ${n + 1}`}
              aria-pressed={n === i}
              onClick={() => setI(n)}
            >
              <Image src={src} alt="" width={136} height={136} sizes="68px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
