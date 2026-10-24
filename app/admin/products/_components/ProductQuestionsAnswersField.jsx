"use client";

import { MessageCircleQuestion, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-text outline-none focus:border-primary";

export default function ProductQuestionsAnswersField({ questionsAnswers = [] }) {
  const [rows, setRows] = useState(() => questionsAnswers.map(({ question, answer }) => ({ question, answer, key: crypto.randomUUID() })));
  const addRow = () => setRows((current) => [...current, { question: "", answer: "", key: crypto.randomUUID() }]);
  const removeRow = (key) => setRows((current) => current.filter((row) => row.key !== key));
  const updateRow = (key, field, value) => setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));

  return (
    <section className="col-span-full space-y-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary-soft p-2.5 text-primary"><MessageCircleQuestion size={20} /></span>
          <div><h2 className="font-bold">Product questions &amp; answers</h2><p className="mt-1 text-sm text-text-muted">Add answers about this product. They appear in an expandable section on the product page and the AI will prioritize them for matching questions.</p></div>
        </div>
        <button type="button" onClick={addRow} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-soft"><Plus size={16} /> Add Q&amp;A</button>
      </div>
      <input type="hidden" name="productQuestionsAnswers" value={JSON.stringify(rows.map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() })).filter((row) => row.question && row.answer))} />
      {rows.map((row, index) => (
        <article key={row.key} className="grid gap-3 rounded-xl border border-border bg-surface-muted/40 p-3 sm:p-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Question {index + 1}</h3><button type="button" onClick={() => removeRow(row.key)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-danger hover:bg-danger/10"><Trash2 size={14} /> Remove</button></div>
          <label className="grid gap-1 text-sm font-semibold">Question<input value={row.question} onChange={(event) => updateRow(row.key, "question", event.target.value)} maxLength={500} className={inputClass} placeholder="For example: How long does the battery last?" /></label>
          <label className="grid gap-1 text-sm font-semibold">Answer<textarea value={row.answer} onChange={(event) => updateRow(row.key, "answer", event.target.value)} maxLength={3000} rows={3} className={inputClass} placeholder="Write the approved answer for customers" /></label>
        </article>
      ))}
      {!rows.length && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-text-muted">No product questions and answers yet.</p>}
    </section>
  );
}
