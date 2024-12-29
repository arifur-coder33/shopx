export function cloudinaryMainImage(imageName) {
  const urlGen =  `https://res.cloudinary.com/bdmart24/image/upload/bdmart24/`+imageName;
console.log(urlGen)
  return urlGen;
}
