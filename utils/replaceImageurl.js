export function convertImageToOG_cloudinary(url, templatename) {
  const updatedUrl = url.replace("/upload/", `/upload/${templatename}/`);
  console.log(updatedUrl)
  return updatedUrl;
}
