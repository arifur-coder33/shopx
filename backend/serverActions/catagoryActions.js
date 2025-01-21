"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(formData) {
  const formDataObj = Object.fromEntries(formData.entries());
  console.log("enter");
  try {
    let data = {
      name: formData.get("name"),
      slug: formData.get("name").toLowerCase().split(" ").join("-"),
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.category.findUnique({
      where: { slug: data?.slug },
    });
    console.log(checkSlug);
    if (checkSlug) {
      throw new Error("Already Availabe ");
    }

    // }

    const details = await prisma.category.create({
      data: data,
    });
    revalidatePath("/admin/product/add");
    return { success: true, details }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getCategory() {
  try {
    const data = await prisma.category.findMany();
    return { success: true, data }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getAllCategoryWithproduct() {
  try {
    const data = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          where: {
            isActive: true,
          },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 10,
          select: {
            id: true,
            title: true,
            regularPrice: true,
            discountPrice: true,
            slug: true,
            mainImage: true,
          },
        },
      },
    });
    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getCategoryWithproduct(slug) {
  console.log("slugf data");
  console.log(slug);
  const decodedSlug = decodeURIComponent(slug);
  try {
    const data = await prisma.category.findUnique({
      where: {
        slug: decodedSlug,
      },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          select: {
            id: true,
            title: true,
            regularPrice: true,
            discountPrice: true,
            slug: true,
            mainImage: true,
          },
        },
      },
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
