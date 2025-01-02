export function cloudinaryMainImage(imageName,width,height) {
  console.log(`https://res.cloudinary.com/bdmart24/image/upload/w_400,h_400,f_auto,q_auto/bdmart24/${imageName}`)
  return `https://res.cloudinary.com/bdmart24/image/upload/w_${width},h_${height},f_auto,q_auto/bdmart24/${imageName}`;
}

export function cloudinaryBlurImage(imageName) {
  console.log(`https://res.cloudinary.com/bdmart24/image/upload/e_blur:200,w_10/f_auto,q_auto/bdmart24/${imageName}`)
  return `https://res.cloudinary.com/bdmart24/image/upload/e_blur:200,w_10/f_auto,q_auto/bdmart24/${imageName}`;
}
