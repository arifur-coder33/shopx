import prisma from "@/lib/prisma";

export function generateSlug(text) {
  return text
    .toString()
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with dashes
    .replace(/[^\w-]+/g, "") // Remove all non-word characters except dashes
    .replace(/--+/g, "-") // Replace multiple dashes with a single dash
    .replace(/^-+|-+$/g, ""); // Remove leading or trailing dashes
}

export async function newSlug(text) {
  let SLUG = generateSlug(text);
  const checkSlug = await prisma.product.findUnique({
    where: { slug: SLUG },
  });

  if (checkSlug) {
    SLUG = SLUG + "-" + Math.floor(Math.random() * 10);
  }

  return SLUG;
}

export async function generateUniqueSlug(tx, baseSlug, productId = null) {
  let where = { slug: baseSlug };
  if (productId) {
    where.NOT = { id: productId };
  }

  const conflictingProduct = await tx.product.findFirst({ where });
  if (!conflictingProduct) {
    return baseSlug;
  }

  let counter = 1;
  let candidateSlug;
  while (true) {
    candidateSlug = `${baseSlug}-${counter}`;
    const newWhere = { ...where, slug: candidateSlug };
    const existing = await tx.product.findFirst({ where: newWhere });
    if (!existing) {
      return candidateSlug;
    }
    counter++;
  }
}
