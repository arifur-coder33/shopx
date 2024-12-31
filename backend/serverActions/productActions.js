"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cloudinaryUpload } from "../utils/cloudinary";

export async function createProductAction(formData) {
  let data = Object.fromEntries(formData.entries());
  try {
    if (!data?.title || !data?.regularPrice || !data?.mainImage) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    let slug = data?.slug
      ? data.slug.trim().toLowerCase().split(" ").join("-")
      :data.title.trim().toLowerCase().split(" ").join("-")
    const result = await prisma.$transaction(async (tx) => {
      const checkSlug = await tx.product.findUnique({
        where: { slug: slug },
      });

      if (checkSlug) {
        slug = data.slug + "-" + Math.floor(Math.random() * 10);
      }
      const uploadResult = await cloudinaryUpload({
        image: data?.mainImage,
        slug,
        tag: data?.seoKeyWord,
        perifix:'_mainImage'
      });

      console.log(uploadResult);
      data = {
        ...data,
        slug: slug,
        category: {
          connect: { id: data?.category },
        },
        mainImage: uploadResult.display_name + "." + uploadResult.format,
        regularPrice: data?.regularPrice && Number(data?.regularPrice),
        discountPrice: data?.discountPrice && Number(data?.discountPrice),
        stockQuantity: data?.stockQuantity && Number(data?.stockQuantity),
        insideDhaka: data?.insideDhaka && Number(data?.insideDhaka),
        outSideDhaka: data?.outSideDhaka && Number(data?.outSideDhaka),
        weight: data?.weight && Number(data?.weight),
      };
      const details = await tx.product.create({
        data: data,
      });
      return details;
    });
    console.log("result");
    console.log(result);
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidateTag("products");
    return { success: true, result }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

// export async function getProducts() {
//   try {
//     const data = await prisma.product.findMany({
//       include: {
//         category: {
//           select: {
//             name: true, // Include only the category name
//           },
//         },
//       },
//     });
//     return { success: true, data }; // Return success with product data
//   } catch (error) {
//     console.log(error.message);
//     return { success: false, error: error.message }; // Return structured error
//   }
// }

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

export const getProducts = unstable_cache(
  async () => {
    const data = await prisma.product.findMany({
      include: {
        category: {},
      },
      //     });
    });

    return { success: true, data };
  },
  ["products"],
  { revalidate: 3600, tags: ["products"] }
);

export const getProductBySlug = async (slug) => {
  try {
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
    const uploadResult = await cloudinaryUpload({
      image: data?.mainImage,
      slug: slug,
      tag: data?.seoKeyWord,
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
    // Delete the order by its ID
    const deletedOrder = await prisma.product.delete({
      where: {
        id: id,
      },
    });
    revalidatePath("/");
    revalidatePath("/admin/product");
    revalidatePath(`/product/${deletedOrder?.slug}`);
    revalidatePath(`/buynow/${deletedOrder?.slug}`);
    revalidateTag("products");
    revalidateTag(`product-${deletedOrder?.slug}`);
    revalidateTag(`product-${id}`);
    return {
      success: true,
      data: " deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting the product:", error);
    return {
      success: false,
      message: error.message || "Failed to delete ",
    };
  } finally {
    await prisma.$disconnect();
  }
}