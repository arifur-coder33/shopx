import cloudinary from "@/lib/cloudinary";
export async function cloudinaryUpload({ image, tag, slug, perifix }) {
  const imagebuffer = Buffer.from(await image.arrayBuffer());
  const base64 = imagebuffer.toString("base64");
  const formatimage = `data:${image.type};base64,${base64}`;
  const uploadResult = await cloudinary.uploader.upload(formatimage, {
    folder: process.env.CLOUDINARY_FOLDER,
    public_id: slug + perifix +"_"+ Date.now(),
    tags: [process.env?.NEXT_SHOP_NAME,...tag],
  });

  return uploadResult;
}

export async function cloudinaryDestroy(publicId) {
  const getPublicId = publicId.split(".")[0];
  const folderName = process.env.CLOUDINARY_FOLDER;
  const resourcePath = `${folderName}/${getPublicId}`;
  try {
 
    // Check if the resource exists
    const resource = await cloudinary.api.resource(resourcePath);
    console.log(resource)
    if (resource.placeholder) {
      console.log("Resource is a placeholder. No real asset exists.");
      return null;
    }
    const deleteResult = await cloudinary.uploader.destroy(
      resourcePath
    );
    console.log(deleteResult);
    if (deleteResult.result === "ok") {
      console.log("Image deleted successfully:", deleteResult);
      return deleteResult; // Return the successful delete response
    } else if (deleteResult.result === "not found") {
      console.log("Image not found, no deletion performed.");
      return; // Return null if the image is not found
    }
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw new Error("Failed to delete the image");
  }
}

export async function deleteMultipleFile(files) {
  if (files.length > 0) {
    // const galleryImageIds = product.imageGallery.map(
    //   (image) => image.split(".")[0]
    // );
    await Promise.all(files.map((id) => cloudinaryDestroy(id)));
  }
  return;
}
