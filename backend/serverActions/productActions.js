"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

export async function createProductAction(formData) {
  let data = Object.fromEntries(formData.entries());
  try {
    if (!data?.title || !data?.regularPrice || !data?.mainImage) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const slug = data?.slug
      ? data?.slug.split(" ").join("-")
      : data?.title.split(" ").join("-");
    data = {
      ...data,
      slug: slug,
      regularPrice: data?.regularPrice && Number(data?.regularPrice),
      discountPrice: data?.discountPrice && Number(data?.discountPrice),
      stockQuantity: data?.stockQuantity && Number(data?.stockQuantity),
      insideDhaka: data?.insideDhaka && Number(data?.insideDhaka),
      outSideDhaka: data?.outSideDhaka && Number(data?.outSideDhaka),
      weight: data?.weight && Number(data?.weight),
    };
    const checkSlug = await prisma.product.findUnique({
      where: { slug: slug },
    });

    if (checkSlug) {
      data = {
        ...data,
        slug: data.slug + "-" + Math.floor(Math.random() * 10),
      };
    }

    const details = await prisma.product.create({
      data: data,
    });
    revalidatePath("/admin/product");
    revalidatePath("/");
    revalidateTag("products");
    return { success: true, details }; // Return success with user data
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

  const UpdatedData = {
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
