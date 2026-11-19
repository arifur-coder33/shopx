"use client";

import SearchableDropdown from "@/components/input/SearchableDropdown";
import { orderItemStockLines } from "@/lib/bundleStock";

export default function DeliveryStockAllocation({ order, warehouseId, batches, allocations, setAllocations }) {
  const lines = order.orderItems.flatMap((item) => orderItemStockLines(item).map((line) => ({
    ...line,
    orderItemId: item.id,
    bundleName: item.bundleComponents?.length ? item.productName : null,
  })));
  return (
    <div className="mt-5 space-y-3">
      <h3 className="font-bold">Allocate order items by batch / supplier lot</h3>
      {lines.map((line) => {
        const id = `${line.orderItemId}:${line.variationId}`;
        const choices = batches.filter((batch) => batch.variationId === line.variationId &&
          batch.goodsReceipt?.warehouseId === warehouseId && batch.deliveredQuantity < batch.quantity);
        const rows = allocations[id] || [{ orderItemId: line.orderItemId, quantity: line.quantity }];
        const update = (nextRows) => setAllocations((current) => ({ ...current, [id]: nextRows }));
        const updateRow = (index, change) => update(rows.map((row, i) => i === index ? { ...row, ...change } : row));
        return (
          <section key={id} className="space-y-2 rounded-brand border border-border p-3 text-sm">
            <p className="font-semibold">{line.title} · {line.sku} × {line.quantity}</p>
            {line.bundleName && <p className="text-text-muted">Bundle: {line.bundleName}</p>}
            {rows.map((row, index) => (
              <div key={index} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
                <SearchableDropdown
                  name={`batch-${id}-${index}`}
                  label="Batch / supplier lot"
                  defaultId={row.goodsReceiptItemId ? choices.map(batchOption).find(({ id }) => id === row.goodsReceiptItemId) : null}
                  dropDownLists={choices.map(batchOption)}
                  onSelect={(batch) => updateRow(index, { goodsReceiptItemId: batch.id })}
                  onClear={() => updateRow(index, { goodsReceiptItemId: null })}
                />
                <input aria-label={`Quantity for ${line.sku}`} type="number" min="0" step="0.01"
                  className="rounded-lg border border-border bg-background px-2 py-2"
                  value={row.quantity} onChange={(event) => updateRow(index, { quantity: event.target.value })} />
                {rows.length > 1 && <button type="button" className="text-rose-600" onClick={() => update(rows.filter((_, i) => i !== index))}>Remove</button>}
              </div>
            ))}
            {choices.length > rows.length && <button type="button" className="text-primary" onClick={() => update([...rows, { orderItemId: line.orderItemId, quantity: "" }])}>+ Add batch</button>}
          </section>
        );
      })}
    </div>
  );
}

function batchOption(batch) {
  return { id: batch.id, name: `${batch.batchNumber} · ${batch.supplierLotNumber} (${batch.quantity - batch.deliveredQuantity} available)` };
}
