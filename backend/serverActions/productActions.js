"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cloudinaryDestroy, cloudinaryUpload } from "../utils/cloudinary";

export async function createProductAction(formData) {
  try {
    // Parse and validate form data
    let data = Object.fromEntries(formData.entries());
    if (!data?.title || !data?.regularPrice || !formData.get("mainImage")) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }

    // Generate or refine slug
    let slug = data?.slug
      ? data.slug.trim().toLowerCase().split(" ").join("-")
      : data.title.trim().toLowerCase().split(" ").join("-");
    const checkSlug = await prisma.product.findUnique({
      where: { slug: slug },
    });
    if (checkSlug) {
      slug = data.slug + "-" + Math.floor(Math.random() * 10);
    }

    // Handle main image
    const mainImageFile = formData.get("mainImage");
    const mainImageBuffer = Buffer.from(await mainImageFile.arrayBuffer());
    const mainImageBase64 = mainImageBuffer.toString("base64");
    const mainImageUpload = await cloudinaryUpload({
      image: `data:${mainImageFile.type};base64,${mainImageBase64}`,
      slug,
      tag: data?.seoKeyWord,
      perifix: "_mainImage",
    });

    // Handle image gallery
    const imageGalleryFiles = formData.getAll("imageGallery");
    const imageGalleryUploads = await Promise.all(
      imageGalleryFiles.map(async (file, index) => {
        const galleryBuffer = Buffer.from(await file.arrayBuffer());
        const galleryBase64 = galleryBuffer.toString("base64");
        return await cloudinaryUpload({
          image: `data:${file.type};base64,${galleryBase64}`,
          slug: `${slug}_${index + 1}`,
          tag: data?.seoKeyWord,
          perifix: "_galleryImage",
        });
      })
    );

    // Prepare data for Prisma
    const preparedData = {
      ...data,
      slug: slug,
      category: {
        connect: { id: data?.category },
      },
      mainImage: `${mainImageUpload.display_name}.${mainImageUpload.format}`,
      imageGallery: imageGalleryUploads.map(
        (img) => `${img.display_name}.${img.format}`
      ),
      regularPrice: data?.regularPrice && Number(data?.regularPrice),
      discountPrice: data?.discountPrice && Number(data?.discountPrice),
      stockQuantity: data?.stockQuantity && Number(data?.stockQuantity),
      insideDhaka: data?.insideDhaka && Number(data?.insideDhaka),
      outSideDhaka: data?.outSideDhaka && Number(data?.outSideDhaka),
      weight: data?.weight && Number(data?.weight),
    };
    const result = await prisma.$transaction(async (tx) => {
      return await tx.product.create({
        data: preparedData,
      });
    });

    // Revalidate paths and tags
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidateTag("products");

    return { success: true, result }; // Return success
  } catch (error) {
    console.error(error.message);
    return { success: false, error: error.message }; // Return structured error
  } finally {
    await prisma.$disconnect();
  }
}

export async function getProductById(id) {
  try {
    const data = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: {
          select: {
            name: true, // Include only the category name
          },
        },
      },
    });
    return { success: true, data }; // Return success with product data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export const getProducts = async () => {
  const data = await prisma.product.findMany({
    include: {
      category: {},
    },
    //     });
  });

  return { success: true, data };
};

export const getProductBySlug = async (slug) => {
  try {
    console.log("bacekd");
    console.log(slug);
    const data = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            name: true, // Include only the category name
          },
        },
      },
    });
    console.log(data);
    return { success: true, data }; // Return success with product data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
};

export const updateProductAction = async ({ productId, formData, slug }) => {
  const data = Object.fromEntries(formData.entries());
  let UpdatedData;

  UpdatedData = {
    ...data,
    regularPrice: data?.regularPrice && Number(data?.regularPrice),
    discountPrice: data?.discountPrice && Number(data?.discountPrice),
    stockQuantity: data?.stockQuantity && Number(data?.stockQuantity),
    insideDhaka: data?.insideDhaka && Number(data?.insideDhaka),
    outSideDhaka: data?.outSideDhaka && Number(data?.outSideDhaka),
    weight: data?.weight && Number(data?.weight),

    category: {
      connect: { id: data?.category },
    },
  };
  if (data?.mainImage) {
    const mainImageBuffer = Buffer.from(await data?.mainImage.arrayBuffer());
    const mainImageBase64 = mainImageBuffer.toString("base64");
    const uploadResult = await cloudinaryUpload({
      image: `data:${mainImageFile.type};base64,${mainImageBase64}`,
      slug,
      tag: data?.seoKeyWord,
      perifix: "_mainImage",
    });

    UpdatedData = {
      ...UpdatedData,
      mainImage: uploadResult.display_name + "." + uploadResult.format,
    };
  }

  try {
    const update = await prisma.product.update({
      where: { id: productId },
      data: UpdatedData,
    });

    revalidatePath("/");
    revalidatePath("/admin/product");
    revalidatePath(`/product/${slug}`);
    revalidatePath(`/buynow/${slug}`);
    revalidateTag("products");
    revalidateTag(`product-${slug}`);
    revalidateTag(`product-${productId}`);
    return {
      success: true,
      message: "সফল ভাবে আপডেইট করা হয়েছে।",
      data: update,
    };
  } catch (error) {
    return {
      SubmitEvent: false,
      message: error?.message || "আবার চেস্টা করুন।",
    };
  }
};

export async function deleteProductById(id) {
  try {
    // Fetch the product to get its image data
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        mainImage: true,
        imageGallery: true,
        slug: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Delete images from Cloudinary
    const mainImageId = product.mainImage.split(".")[0]; // Extract the public ID (without file extension)
    await cloudinaryDestroy(mainImageId);

    if (
      Array.isArray(product.imageGallery) &&
      product.imageGallery.length > 0
    ) {
      const galleryImageIds = product.imageGallery.map(
        (image) => image.split(".")[0]
      ); // Extract public IDs
      await Promise.all(galleryImageIds.map((id) => cloudinaryDestroy(id)));
    }

    // Delete the product from the database
    const deletedProduct = await prisma.product.delete({
      where: { id },
    });

    // Revalidate paths and tags
    revalidatePath("/");
    revalidatePath("/admin/product");
    revalidatePath(`/product/${deletedProduct?.slug}`);
    revalidatePath(`/buynow/${deletedProduct?.slug}`);
    revalidateTag("products");
    revalidateTag(`product-${deletedProduct?.slug}`);
    revalidateTag(`product-${id}`);

    return {
      success: true,
      data: "Product deleted successfully, including its images.",
    };
  } catch (error) {
    console.error("Error deleting the product:", error);
    return {
      success: false,
      message: error.message || "Failed to delete the product.",
    };
  } finally {
    await prisma.$disconnect();
  }
}
