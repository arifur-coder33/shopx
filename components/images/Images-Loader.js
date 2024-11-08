"use client";
export const customLoader = ({ src, width, quality }) => {
  return `https://images.unsplash.com/flagged/${src}?w=${width}&q=${
    quality || 75
  }`;
};
