"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  cloudinaryDestroy,
  cloudinaryUpload,
  deleteMultipleFile,
} from "../utils/cloudinary";
import { newSlug } from "../utils/generateSlug";

export async function createProductAction(formData) {
  try {
    // Parse and validate form data
    let data = Object.fromEntries(formData.entries());
    if (
      !data?.title ||
      !data?.regularPrice ||
      !formData.get("mainImage").size > 0
    ) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }

    // Generate or refine slug
    const slug = await newSlug(data?.slug || data?.title);

    // Handle main image
    const mainImageFile = formData.get("mainImage");
    let mainImageUpload;
    if (mainImageFile) {
      mainImageUpload = await cloudinaryUpload({
        image: mainImageFile,
        tag: data?.seoKeyWord,
        slug,
        perifix: "_mainImage",
      });
    }

    //Image Gallery Upload
    let imageGalleryUploads = [];
    const imageGalleryFiles = formData.getAll("imageGallery");
    const validFiles = imageGalleryFiles.filter((file) => file.size > 0);
    if (validFiles.length > 0) {
      await Promise.all(
        imageGalleryFiles.map(async (file, index) => {
          const upload = await cloudinaryUpload({
            image: file,
            tag: data?.seoKeyWord,
            slug: `${slug}_${index + 1}`,
            perifix: "_galleryImage",
          });
          const formate = `${upload.display_name}.${upload.format}`;
          imageGalleryUploads.push(formate);
        })
      );
    }

    const preparedData = {
      ...data,
      slug: slug,
      category: {
        connect: { id: data?.category },
      },
      mainImage: `${mainImageUpload.display_name}.${mainImageUpload.format}`,
      imageGallery: imageGalleryUploads,
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

    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidateTag("products");

    return { success: true, result }; // Return success
  } catch (error) {
    console.error(error.message);
    return { success: false, message: error.message }; // Return structured error
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
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });
  if (!product) {
    throw new Error("Product Not found");
  }
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

  if (product?.slug !== data?.slug) {
    // Generate or refine slug
    const slug = await newSlug(data?.slug || data?.title);
    UpdatedData = {
      ...UpdatedData,
      slug: slug,
    };
  }
  const mainImageFile = formData.get("mainImage");

  if (mainImageFile) {
    const upload = await cloudinaryUpload({
      image: mainImageFile,
      tag: data?.seoKeyWord,
      slug,
      perifix: "_mainImage",
    });
console.log('update main image')
    console.log(upload)
    /// Delete previous photo 
    if (product?.mainImage) {
      await cloudinaryDestroy(product?.mainImage);
    }
   
    const mainImage = `${upload.display_name}.${upload.format}`;
    UpdatedData = {
      ...UpdatedData,
      mainImage,
    };
  }

  //Image Gallery Upload
  let imageGalleryUploads = [];
  const imageGalleryFiles = formData.getAll("imageGallery");
  const validFiles = imageGalleryFiles.filter((file) => file.size > 0);

  if (validFiles.length > 0) {
    await Promise.all(
      imageGalleryFiles.map(async (file, index) => {
        const upload = await cloudinaryUpload({
          image: file,
          tag: data?.seoKeyWord,
          slug: `${slug}_${index + 1}`,
          perifix: "_galleryImage",
        });
        const formate = `${upload.display_name}.${upload.format}`;
        imageGalleryUploads.push(formate);
/// Delete Previous image gallery
        if (product.imageGallery && product.imageGallery?.length > 0) {
          await deleteMultipleFile(product.imageGallery);
        }
      })
    );
  }
  if (imageGalleryUploads?.length > 0) {
    UpdatedData = {
      ...UpdatedData,
      imageGallery: imageGalleryUploads,
    };
  }

  try {
    const update = await prisma.product.update({
      where: { id: productId },
      data: UpdatedData,
    });

    console.log(update);

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
      success: false,
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

// Delete main image
if (product?.mainImage) {
   await cloudinaryDestroy(product?.mainImage);

}

    // Delete gallery images
    if (product.imageGallery && product.imageGallery?.length > 0) {
      await deleteMultipleFile(product.imageGallery);
    }

    // Delete product from the database
    const deletedProduct = await prisma?.product?.delete({
      where: { id },
    });

    // Revalidate paths and tags
    if (deletedProduct?.slug) {
      revalidatePath(`/product/${deletedProduct.slug}`);
      revalidatePath(`/buynow/${deletedProduct.slug}`);
      revalidateTag(`product-${deletedProduct.slug}`);
    }

    revalidatePath("/");
    revalidatePath("/admin/product");
    revalidateTag("products");
    revalidateTag(`product-${id}`);

    return {
      success: true,
      data: "Product deleted successfully, including its images.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete the product.",
    };
  } finally {
    await prisma.$disconnect();
  }
}
