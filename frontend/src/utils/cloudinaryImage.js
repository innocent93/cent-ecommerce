// Inserts Cloudinary's automatic-format/automatic-quality + width transform
// into an existing Cloudinary delivery URL, e.g.:
//   https://res.cloudinary.com/demo/image/upload/v1/products/x.jpg
//   -> https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_500/v1/products/x.jpg
// This is a free Cloudinary feature (no plan upgrade needed) that serves
// WebP/AVIF to browsers that support it and compresses appropriately —
// meaningfully smaller payloads with zero backend changes, since all
// product images already go through Cloudinary (see product.service.js).
// Non-Cloudinary URLs are returned unchanged (safe no-op).
export const optimizedImage = (url, width) => {
  if (!url || typeof url !== 'string') return url;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const transform = `f_auto,q_auto${width ? `,w_${width}` : ''}`;
  const insertAt = idx + marker.length;
  return `${url.slice(0, insertAt)}${transform}/${url.slice(insertAt)}`;
};

export default optimizedImage;
