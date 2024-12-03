"use client";
export const customLoader = ({ src, width, quality }) => {
  return `${src.replace(
    "/upload/",
    `/upload/w_${width},h_${width},c_scale/`
  )}?q=${quality || 75}`;
};
