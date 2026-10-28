"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { saveChatAiTeachingsAction } from "@/backend/serverActions/chatActions";

const blankTeaching = () => ({ question: "", answer: "" });

export default function AiTeachPage({ initialTeachings = [], initialError = "", canUpdate = false }) {
  const [teachings, setTeachings] = useState(initialTeachings.length ? initialTeachings : [blankTeaching()]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(initialError);

  const update = (index, key, value) => setTeachings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const add = () => setTeachings((current) => current.length >= 40 ? current : [...current, blankTeaching()]);
  const remove = (index) => setTeachings((current) => current.length === 1 ? [blankTeaching()] : current.filter((_, itemIndex) => itemIndex !== index));

  async function save(event) {
    event.preventDefault();
    if (!canUpdate || saving) return;
    setSaving(true);
    setNotice("");
    const result = await saveChatAiTeachingsAction(teachings);
    setSaving(false);
    if (result.success) {
      setTeachings(result.data.length ? result.data : [blankTeaching()]);
      setNotice(result.message || "সংরক্ষণ হয়েছে।");
    } else setNotice(result.message || "সংরক্ষণ করা যায়নি।");
  }

  return <main className="mx-auto w-full max-w-4xl space-y-5 pb-10">
    <header className="flex items-start gap-3">
      <Link href="/admin/ai/settings" className="mt-1 rounded-lg border border-border p-2 text-text hover:bg-background" aria-label="AI settings"><ArrowLeft className="h-4 w-4" /></Link>
      <div><p className="text-sm font-medium text-primary">AI</p><h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Teach</h1><p className="mt-1 text-sm text-text-muted">বাস্তব customer message-এর জন্য অনুমোদিত উত্তর যোগ করুন। AI পরের reply-তে কাছাকাছি প্রশ্নের উদাহরণ ব্যবহার করবে।</p></div>
    </header>

    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 text-sm leading-6 text-text">
      <strong>কীভাবে শেখাবেন:</strong> বাম পাশে customer-এর উদাহরণ message, ডান পাশে AI-কে যে reply দিতে হবে তা লিখুন। কোনো তথ্য না থাকলে AI কী চাইবে সেটাও উত্তরে লিখুন—যেমন order status-এর ক্ষেত্রে order number বা order-এর ফোন নম্বর চাইতে বলুন। verified order, product, price ও stock data backend থেকেই আসবে; উদাহরণ দিয়ে সেগুলো অনুমান করানো যাবে না।
    </div>

    {notice && <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm text-text">{notice}</p>}
    <form onSubmit={save} className="space-y-4">
      {teachings.map((item, index) => <section key={index} className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold text-text">উদাহরণ {index + 1}</h2>{canUpdate && <button type="button" onClick={() => remove(index)} aria-label={`উদাহরণ ${index + 1} সরান`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}</div>
        <label className="block"><span className="text-sm font-medium text-text">Customer কী বলতে পারে?</span><textarea value={item.question} onChange={(event) => update(index, "question", event.target.value)} maxLength={300} rows={2} disabled={!canUpdate} placeholder="যেমন: আমার অর্ডারটা কোথায়?" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand disabled:opacity-50" /></label>
        <label className="block"><span className="text-sm font-medium text-text">AI কীভাবে উত্তর দেবে?</span><textarea value={item.answer} onChange={(event) => update(index, "answer", event.target.value)} maxLength={500} rows={3} disabled={!canUpdate} placeholder="যেমন: অর্ডার খুঁজে দেখতে order number অথবা অর্ডারের সময় দেওয়া ফোন নম্বরটি চাইবে।" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand disabled:opacity-50" /></label>
      </section>)}
      <div className="flex flex-wrap justify-between gap-3">{canUpdate && <button type="button" onClick={add} disabled={teachings.length >= 40} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text hover:bg-background disabled:opacity-50"><Plus className="h-4 w-4" />উদাহরণ যোগ করুন</button>}{canUpdate && <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "সংরক্ষণ হচ্ছে…" : "Teachings সংরক্ষণ"}</button>}</div>
    </form>
  </main>;
}
