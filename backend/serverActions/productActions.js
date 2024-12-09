"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cache } from "react";

export async function createProductAction(formData) {
  const formDataObj = Object.fromEntries(formData.entries());
  try {
    let data = {
      title: formData.get("title"),
      slug: formData.get("title").split(" ").join("-"),
      description: formData.get("description"),
      categoryId: formData.get("categoryId"),
      regularPrice: Number(formData.get("regularPrice")),
      discountPrice: Number(formData.get("discountPrice")),
      stockQuantity: Number(formData.get("stockQuantity")),
      images: [formData.get("images")],
      isFeatured: formData.get("isFeatured"),
      isActive: formData.get("isActive"),
      color: formData.get("color"),
      size: formData.get("size"),
      insideDhaka: Number(formData.get("insideDhaka")),
      outSideDhaka: Number(formData.get("outSideDhaka")),
      weight: Number(formData.get("weight")),
    };

    if (!data?.title || !data?.regularPrice || !data?.images) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.product.findUnique({
      where: { slug: data?.slug },
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
    revalidatePath("/admin/product/add");
    revalidatePath("/");
    revalidateTag("products");
    return { success: true, details }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getProducts() {
  try {
    const data = await prisma.product.findMany({
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

export const getProductBySlug = cache(async (slug) => {
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
});

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
    images: [data?.images],
    category: {
      connect: { id: data?.category },
    },
  };
  console.log(UpdatedData);
  try {
    const update = await prisma.product.update({
      where: { id: productId },
      data: UpdatedData,
    });

    console.log(UpdatedData);
    // revalidatePath("/");
    // revalidatePath("/admin/product");
    console.log(slug);
    revalidateTag("products");
    revalidateTag(slug);
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
