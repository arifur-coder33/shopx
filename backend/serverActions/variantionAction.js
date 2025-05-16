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

export async function updateVariationAction({ formData, id }) {
  const data = Object.fromEntries(formData.entries());
  console.log(id);
  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkData = await prisma.variationName.findUnique({
      where: { id },
    });

    if (!checkData) {
      throw new Error("Invalide id");
    }
    const saveData = await prisma.variationName.update({
      where: { id },
      data: preparedData,
    });
    // }

    revalidatePath("/admin/variation");
    return { success: true, data: saveData }; // Return success with user data
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

export async function getVariationByCategoryId(id) {
  console.log(`SERVER ACTION: getVariationByCategoryId called with ID: ${id}`);
  try {
    const data = await prisma.variationValue.findMany({
      where: { categoryId: id },
      include: {
        variation: {
          select: { id: true, name: true }, // Include the related variation data
        }, // Include the related variationName data
      },
    });

    const grouped = Object.values(
      data.reduce((acc, item) => {
        const key = item.variation.id;
        if (!acc[key]) {
          acc[key] = {
            variation: {
              id: item.variation.id,
              name: item.variation.name,
            },
            values: [],
          };
        }
        acc[key].values.push({
          id: item.id,
          value: item.value,
        });
        return acc;
      }, {})
    );

    console.log(grouped);

    return { success: true, data: grouped }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}
export async function getVariationById(id) {
  try {
    const data = await prisma.variationName.findUnique({
      where: { id },
    });
    return { success: true, data }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}
