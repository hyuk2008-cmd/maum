"use client";

import { useState } from "react";

/**
 * Renders a Google Drive-hosted flyer photo by file id. Falls back to
 * nothing if the image fails to load (e.g. sharing permissions), since
 * these are personal Drive files, not a public image host.
 */
export default function DriveImage({
  fileId,
  alt,
  className,
}: {
  fileId: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://drive.google.com/thumbnail?id=${fileId}&sz=w800`}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
