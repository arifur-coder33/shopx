"use client";

import { useState } from "react";
import Modal from "@/components/modal/Modal";
import ImageCustom from "@/components/images/ImageCustom";

const millimetres = { mm: 1, cm: 10, inch: 25.4 };

export function SizeGuide({ chart }) {
  const [unit, setUnit] = useState(chart.unit);
  const format = (value) => Number((value * millimetres[chart.unit] / millimetres[unit]).toFixed(2)).toString();
  return <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <div>{chart.image?.name && <ImageCustom src={chart.image.name} alt={`${chart.name} measurement guide`} w={640} h={640} objectFit="contain" className="h-auto w-full" />}</div>
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{chart.name}</h2>
        <div aria-label="Measurement unit" role="group" className="flex gap-1">
          {Object.keys(millimetres).map((option) => <button type="button" key={option} aria-pressed={unit === option} onClick={() => setUnit(option)} className={`rounded border border-border px-2 py-1 text-sm ${unit === option ? "bg-primary text-white" : ""}`}>{option}</button>)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-muted"><th scope="col" className="p-2 text-left">Measurement ({unit})</th>{chart.sizes.map((size) => <th scope="col" className="p-2" key={size}>{size}</th>)}</tr></thead>
          <tbody>{chart.rows.map((row, index) => <tr key={index} className="border-b border-border">
            <th scope="row" className="p-2 text-left">{row.kind === "recommendation" ? "Recommended for: " : ""}{row.name}</th>
            {chart.sizes.map((size) => <td key={size} className="whitespace-nowrap p-2 text-center">{row.cells[size]?.map(format).join("-") || "—"}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {chart.note && <p className="whitespace-pre-line rounded-lg bg-surface-muted px-3 py-2 text-sm leading-6 text-text-secondary">{chart.note}</p>}
    </div>
  </div>;
}

export function SizeGuideButton({ chart }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="ml-2 text-xs font-semibold text-primary underline" onClick={() => setOpen(true)}>Size Guide</button>
    <Modal isOpen={open} onClose={() => setOpen(false)}>{open && <SizeGuide chart={chart} />}</Modal>
  </>;
}
