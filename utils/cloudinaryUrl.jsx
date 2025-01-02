export function cloudinaryMainImage(imageName) {
  return `https://res.cloudinary.com/bdmart24/image/upload/f_auto,q_auto/bdmart24/${imageName}`;
}

export function cloudinaryBlurImage(imageName) {
  return `https://res.cloudinary.com/bdmart24/image/upload/e_blur:200,w_10/f_auto,q_auto/bdmart24/${imageName}`;
}
