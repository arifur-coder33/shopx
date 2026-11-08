"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Modal from "@/components/modal/Modal";
import { SizeGuide } from "@/app/(user)/product/_components/SizeGuide";
import { changeSizeChartCategory, deleteSizeChart } from "@/backend/serverActions/sizeChartActions";
import SizeChartEditor from "./SizeChartEditor";

const button = "rounded border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50";

export default function SizeChartManager({ charts, categories, options, canCreate, canEdit, canDelete, canAssign }) {
  const [dialog, setDialog] = useState(null);
  const [categoryId, setCategoryId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const chart = charts.find((item) => item.id === dialog?.id);
  const assigned = chart ? categories.filter((category) => category.sizeChartId === chart.id) : [];
  const available = categories.filter((category) => category.canAssign && !category.sizeChartId);

  function open(mode, id) {
    setCategoryId("");
    setDialog({ mode, id });
  }

  function mutate(action, message, close = false) {
    startTransition(async () => {
      const result = await action();
      if (result.error) return toast.error(result.error);
      toast.success(message);
      setCategoryId("");
      if (close) setDialog(null);
      router.refresh();
    });
  }

  function renderAssignments() {
    const canChangeAssignments = dialog?.mode === "edit" && canAssign;
    return <section className="mt-5 space-y-3 border-t border-border pt-4">
      <h3 className="font-semibold">Assigned categories ({assigned.length})</h3>
      {assigned.length === 0 && <p className="text-sm text-text-muted">No direct assignments.</p>}
      <ul className="space-y-2">{assigned.map((category) => <li key={category.id} className="flex items-center justify-between gap-3">
        <span>{category.label}</span>
        {canChangeAssignments && <button type="button" className={button} disabled={pending} onClick={() => mutate(() => changeSizeChartCategory(chart.id, category.id, false), "Category assignment removed.")}>Remove</button>}
      </li>)}</ul>
      {canChangeAssignments && <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Category to assign" className={button} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Select a category</option>
          {available.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
        <button type="button" className={button} disabled={pending || !categoryId} onClick={() => mutate(() => changeSizeChartCategory(chart.id, categoryId, true), "Chart assigned to category.")}>Assign category</button>
      </div>}
    </section>;
  }

  return <main className="space-y-4 p-4">
    <header className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Size Charts</h1>
      {canCreate && <button type="button" className="rounded bg-primary px-4 py-2 font-semibold text-white" onClick={() => open("create")}>Add New</button>}
    </header>
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-border"><th className="p-3">Chart name</th><th className="p-3">Assigned categories</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{charts.map((item) => {
          const count = categories.filter((category) => category.sizeChartId === item.id).length;
          return <tr key={item.id} className="border-b border-border">
            <th scope="row" className="p-3">{item.name}</th>
            <td className="p-3">{count}</td>
            <td className="p-3"><div className="flex gap-2">
              <button type="button" className={button} onClick={() => open("view", item.id)}>View</button>
              {canEdit && <button type="button" className={button} onClick={() => open("edit", item.id)}>Edit</button>}
              {canDelete && <button type="button" className={button} disabled={count > 0} title={count ? "Remove category assignments before deleting" : undefined} onClick={() => open("delete", item.id)}>Delete</button>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
      {charts.length === 0 && <p className="p-3 text-sm text-text-muted">No size charts yet.</p>}
    </div>

    <Modal isOpen={Boolean(dialog)} onClose={() => setDialog(null)}>
      {dialog?.mode === "create" && <>
        <h2 className="text-xl font-bold">Add size chart</h2>
        <SizeChartEditor options={options} canAddSize onSaved={() => setDialog(null)} />
      </>}
      {dialog?.mode === "edit" && chart && <>
        <h2 className="text-xl font-bold">Edit {chart.name}</h2>
        <SizeChartEditor key={chart.id} chart={chart} options={options} canAddSize={canCreate} onSaved={() => open("view", chart.id)} />
        {renderAssignments()}
      </>}
      {dialog?.mode === "view" && chart && <>
        <SizeGuide key={chart.id} chart={chart} />
        {renderAssignments()}
      </>}
      {dialog?.mode === "delete" && chart && <div className="space-y-3">
        <h2 className="text-xl font-bold">Delete {chart.name}?</h2>
        <button type="button" className={button} disabled={pending} onClick={() => mutate(() => deleteSizeChart(chart.id), "Size chart deleted.", true)}>Delete size chart</button>
      </div>}
    </Modal>
  </main>;
}
