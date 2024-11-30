export async function createProductAction(formData) {
  const formDataObj = Object.fromEntries(formData.entries());
  try {
    const data = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      category: formData.get("category"),
      regularPrice: formData.get("regularPrice"),
      discountPrice: formData.get("discountPrice"),
      stockQuantity: formData.get("stockQuantity"),
      images: formData.get("images"),
      isFeatured: formData.get("isFeatured"),
      isActive: formData.get("isActive"),
      color: formData.get("color"),
      size: formData.get("size"),
      insideDhaka: formData.get("insideDhaka"),
      outSideDhaka: formData.get("outSideDhaka"),
      weight: formData.get("weight"),
    };

    if (!email || !password) {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("আপনি ইতিমধ্যে নিবন্ধন করেছেন।");
    }

    const details = await prisma.product.create({
      data: data,
    });

    return { success: true, details }; // Return success with user data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}
