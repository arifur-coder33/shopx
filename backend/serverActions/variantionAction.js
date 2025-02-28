"use server";
export async function createVariationAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.variation.findUnique({
      where: { name: data?.name },
    });

    if (checkSlug) {
      throw new Error("This Already Availabe ");
    }

    // }

    const details = await prisma.variation.create({
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
    const data = await prisma.variation.findMany();
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
    const checkSlug = await prisma.variation.findUnique({
      where: { name: data?.name },
    });

    if (checkSlug) {
      throw new Error("This Already Availabe ");
    }

    // }

    const details = await prisma.variation.create({
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

export async function deleteVariationAction(formData) {
  const data = Object.fromEntries(formData.entries());

  try {
    const preparedData = {
      ...data,
    };
    if (!data?.name) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
    const checkSlug = await prisma.variation.findUnique({
      where: { name: data?.name },
    });

    if (checkSlug) {
      throw new Error("This Already Availabe ");
    }

    // }

    const details = await prisma.variation.create({
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
