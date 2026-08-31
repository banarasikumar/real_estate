"use client";

import React, { useState } from "react";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function SafeImage({ 
  src, 
  alt, 
  className, 
  fallbackSrc = "https://placehold.co/800x600/e2e8f0/475569?text=Image+Unavailable" 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
}
