export function cloudinaryMainImage(publicId, widthHint, heightHint) {
const cloudName =process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (!cloudName || !publicId) {
    // Fallback to a transparent pixel or minimal placeholder to avoid errors
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_${widthHint},h_${heightHint},f_auto,q_auto,dpr_auto/${process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER}/${publicId}`;
}

// export function cloudinaryMainImage(imageName, width, height) {
//   return `https://res.cloudinary.com/shopzarif/image/upload/w_${width},h_${height},f_auto,q_auto,dpr_auto/shopzy/${imageName}`;
// }

// https://res.cloudinary.com/shopzarif/image/upload
export function cloudinaryBlurImage(imageName) {
  console.log(
    `https://res.cloudinary.com/bdmart24/image/upload/e_blur:200,w_10/f_auto,q_auto/bdmart24/${imageName}`
  );
  return `https://res.cloudinary.com/bdmart24/image/upload/e_blur:200,w_10/f_auto,q_auto/bdmart24/${imageName}`;
}

// export function cloudinaryMainImage(imageName) {
//   const urlGen =  `https://res.cloudinary.com/bdmart24/image/upload/bdmart24/`+imageName;
// console.log(urlGen)
//   return urlGen;
// }
