'use server'

import prisma from "@/lib/prisma";

export async function createProductAction(formData) {
  try {
    let data = {
      title: formData.get("title"),
      slug: formData.get("title").split(" ").join("-"),
      description: formData.get("description"),
      // category: formData.get("category"),
      regularPrice: Number(formData.get("regularPrice")),
      discountPrice: Number(formData.get("discountPrice")),
      stockQuantity: Number(formData.get("stockQuantity")),
      images:[ formData.get("images")],
      isFeatured: formData.get("isFeatured"),
      isActive: formData.get("isActive"),
      color: formData.get("color"),
      size: formData.get("size"),
      insideDhaka:Number( formData.get("insideDhaka")),
      outSideDhaka: Number(formData.get("outSideDhaka")),
      weight: Number(formData.get("weight")),
    };
console.log(data)
    if (!data?.title || !data?.regularPrice || !data?.images)  {
      throw new Error("সব ফিল্ড গুলতে তথ্য দিন।");
    }
const checkSlug=await prisma.product.findUnique({
        where: { slug:data?.slug },
})

if (checkSlug) {
  data={
    ...data,
    slug:data.slug +"-"+ Math.floor(Math.random() * 10)
  }
}
console.log(data)
    // const existingUser = await prisma.user.findUnique({
    //   where: { email },
    // });

    // if (existingUser) {
    //   throw new Error("আপনি ইতিমধ্যে নিবন্ধন করেছেন।");
    // }

    const details = await prisma.product.create({
      data: data,
    });

    return { success: true, details }; // Return success with user data
  } catch (error) {
    console.log(error.message)
    return { success: false, error: error.message }; // Return structured error
  }
}
