// lib/entity-picture.ts — entity picture/image helpers

import type React from "react";

export interface EntityPicture {
  src: string;
  fallback: string;
}

/** Extract picture URL and fallback icon from entity attributes */
export function getEntityPicture(attributes: Record<string, unknown>): EntityPicture | null {
  const pic = attributes?.entity_picture as string | undefined;
  if (!pic) return null;
  return {
    src: pic,
    fallback: (attributes?.icon as string | undefined) ?? "mdi:image",
  };
}

/** <img> onError handler: falls back to data-fallback src or hides image */
export function entityPictureOnError(event: React.SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  const fallback = img.getAttribute("data-fallback");
  if (fallback && img.src !== fallback) {
    img.src = fallback;
  } else {
    img.style.display = "none";
  }
}
