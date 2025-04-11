"use server";

import { revalidatePath } from "next/cache";

export async function createVariationAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.variationName.findUnique({
      where: { name: data?.name },
    });

    if (checkSlug) {
      throw new Error("This Already Availabe ");
    }

    // }

    const details = await prisma.variationName.create({
      data: preparedData,
    });
    console.log(details);
    revalidatePath("/admin/variation");

    return { success: true, data: details }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getVariations() {
  try {
    const data = await prisma.variationName.findMany();
    return { success: true, data }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function updateVariationAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.variationName.findUnique({
      where: { name: data?.name },
    });

    if (checkSlug) {
      throw new Error("This Already Availabe ");
    }

    // }

    const details = await prisma.variationName.create({
      data: preparedData,
    });
    console.log(details);
    revalidatePath("/admin/variation");
    return { success: true, data: details }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function deleteVariationAction(id) {
  try {
    const deleteItem = await prisma?.variationName?.delete({
      where: { id },
    });
    revalidatePath("/admin/variation");
    return { success: true, data: "Successfuully deleted" }; // Return success with user data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}
