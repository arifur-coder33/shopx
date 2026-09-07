export function convertImageToOG_cloudinary(url, templatename) {
  const updatedUrl = url.replace("/upload/", `/upload/${templatename}/`);
  return updatedUrl;
}
