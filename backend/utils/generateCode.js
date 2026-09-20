// backend/utils/generateCode.js
import { requireCurrentStoreId } from "../services/storeContextService";

export async function generateCode(
  tx,
  { name, prefix = "", padding = 6, start = 1, step = 1, storeId },
) {
  const trustedStoreId = storeId || (await requireCurrentStoreId());
  let counter = await tx.counter.findUnique({
    where: { storeId_name: { storeId: trustedStoreId, name } },
  });

  // Counter না থাকলে Create করবে
  if (!counter) {
    counter = await tx.counter.create({
      data: {
        storeId: trustedStoreId,
        name,
        prefix,
        nextValue: start,
        padding,
      },
    });
  }

  // Code Generate
  const code =
    (counter.prefix || "") +
    String(counter.nextValue).padStart(counter.padding, "0");

  // Next Value Update
  await tx.counter.update({
    where: { id: counter.id, storeId: trustedStoreId },
    data: {
      nextValue: {
        increment: step,
      },
    },
  });

  return code;
}

/// ugeases

// const supplierCode = await generateCode(tx, {
//   name: "SUPPLIER",
//   prefix: "11",
//   padding: 5,
// });
