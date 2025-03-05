export function cloudinaryMainImage(imageName, width, height) {
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},f_auto,q_auto,dpr_auto/${process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER}/${imageName}`;
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
