"use client";

import { saveAiSettingsSectionAction, saveProviderCredentialsAction } from "@/backend/serverActions/chatActions";
import { CHAT_AI_MODELS, DEFAULT_CHAT_AI_MODELS } from "@/backend/services/chatAiModels";
import ProviderCredentialsCard from "@/app/admin/chat/_components/ProviderCredentialsCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Bot, MessageSquareText, Save, Sparkles } from "lucide-react";

const fieldClass = "mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

export default function AiSettingsForm({ settings, canUpdate }) {
  const router = useRouter();
  const aiForm = useRef(null);
  const openAiForm = useRef(null);
  const geminiForm = useRef(null);
  const [provider, setProvider] = useState(settings.aiProvider || "OPENAI");
  const [openaiModel, setOpenaiModel] = useState(settings.openaiModel || DEFAULT_CHAT_AI_MODELS.OPENAI);
  const [geminiModel, setGeminiModel] = useState(settings.googleAiStudioModel || DEFAULT_CHAT_AI_MODELS.GOOGLE_AI_STUDIO);
  const [savingAll, setSavingAll] = useState(false);
  const [notice, setNotice] = useState("");

  const saveAll = async () => {
    if (!canUpdate || savingAll) return;
    setSavingAll(true);
    setNotice("");
    const tasks = [
      () => saveProviderCredentialsAction("OPENAI", new FormData(openAiForm.current)),
      () => saveProviderCredentialsAction("GOOGLE_AI_STUDIO", new FormData(geminiForm.current)),
      () => saveAiSettingsSectionAction(new FormData(aiForm.current)),
    ];
    try {
      for (const task of tasks) {
        const result = await task();
        if (!result.success) {
          setNotice(result.message || "সব settings save করা যায়নি।");
          return;
        }
      }
      setNotice("AI settings ও provider credentials সব save হয়েছে।");
      router.refresh();
    } catch { setNotice("Save all ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"); }
    finally {
      setSavingAll(false);
    }
  };

  const saveAiSettings = async (event) => {
    event.preventDefault();
    if (!canUpdate) return;
    setNotice("");
    try {
      const result = await saveAiSettingsSectionAction(new FormData(event.currentTarget));
      setNotice(result.message || (result.success ? "AI settings save হয়েছে।" : "Save করা যায়নি।"));
      if (result.success) router.refresh();
    } catch { setNotice("AI settings save ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"); }
  };

  return <main className="mx-auto w-full max-w-6xl space-y-6 pb-28">
    <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-fuchsia-700 to-indigo-700 p-6 text-white shadow-lg sm:p-9">
      <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><Sparkles size={14} />AI CONTROL CENTER</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">AI Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">AI provider, response style ও credentials এক জায়গা থেকে নিয়ন্ত্রণ করুন। API keys আলাদা encrypted provider card-এ রাখা হয়।</p></div>
        <div className="flex gap-2"><Link href="/admin/chat/settings" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold transition hover:bg-white/20">Chat Settings →</Link><Link href="/admin/ai/teach" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-800 transition hover:bg-white/90">Teach AI</Link></div>
      </div>
    </header>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(400px,.9fr)]">
      <form ref={aiForm} onSubmit={saveAiSettings} className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-700"><Bot size={22} /></span><div><h2 className="text-lg font-bold text-text">AI behavior</h2><p className="mt-1 text-xs leading-5 text-text-muted">কোন model চলবে এবং reply কীভাবে লিখবে সেট করুন।</p></div></div>
        <label className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4"><span><span className="block text-sm font-bold text-text">AI auto-reply</span><span className="mt-1 block text-xs text-text-muted">Customer message এলে AI উত্তর তৈরি করবে।</span></span><input name="aiAutoReplyEnabled" type="checkbox" defaultChecked={settings.aiAutoReplyEnabled} disabled={!canUpdate} className="h-5 w-5 accent-primary" /></label>
        <label className="mt-5 block"><span className="text-sm font-bold text-text">Active AI provider</span><select name="aiProvider" value={provider} onChange={(event) => setProvider(event.target.value)} disabled={!canUpdate} className={fieldClass}><option value="OPENAI">OpenAI</option><option value="GOOGLE_AI_STUDIO">Google AI Studio · Gemini</option></select><span className="mt-1 block text-xs text-text-muted">Provider বদলালে নিচের সেই provider-এর model ব্যবহার হবে।</span></label>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-bold text-text">OpenAI model</span><input type="hidden" name="openaiModel" value={openaiModel} /><select value={openaiModel} onChange={(event) => setOpenaiModel(event.target.value)} disabled={!canUpdate} className={fieldClass}>{CHAT_AI_MODELS.OPENAI.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="block"><span className="text-sm font-bold text-text">Gemini model</span><input type="hidden" name="googleAiStudioModel" value={geminiModel} /><select value={geminiModel} onChange={(event) => setGeminiModel(event.target.value)} disabled={!canUpdate} className={fieldClass}>{CHAT_AI_MODELS.GOOGLE_AI_STUDIO.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div>
        <label className="mt-5 block"><span className="text-sm font-bold text-text">Reply tone ও style</span><textarea name="aiReplyTone" rows={3} maxLength={500} defaultValue={settings.aiReplyTone || "বন্ধুসুলভ, স্বাভাবিক, সংক্ষিপ্ত এবং একজন local shop owner-এর মতো"} disabled={!canUpdate} placeholder="বন্ধুসুলভ, সহজ, natural; ছোট reply; অতিরিক্ত greeting বা emoji নয়" className={fieldClass} /></label>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-bold text-text">ছেলে customer-এর সম্বোধন</span><input name="aiMaleAddressTerm" maxLength={40} defaultValue={settings.aiMaleAddressTerm ?? "ভাইয়া"} disabled={!canUpdate} placeholder="যেমন: ভাইয়া" className={fieldClass} /></label><label className="block"><span className="text-sm font-bold text-text">মেয়ে customer-এর সম্বোধন</span><input name="aiFemaleAddressTerm" maxLength={40} defaultValue={settings.aiFemaleAddressTerm ?? "আপু"} disabled={!canUpdate} placeholder="যেমন: আপু" className={fieldClass} /></label></div>
        <p className="mt-2 text-xs leading-5 text-text-muted">নাম স্পষ্ট না হলে AI নিরপেক্ষ সম্বোধন করবে। Facebook comment ও chat reply-তে এই preference প্রযোজ্য।</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="text-xs text-text-muted">{notice}</p>{canUpdate && <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-500/15"><Save size={16} />Save AI behavior</button>}</div>
      </form>

      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 sm:p-6"><div className="flex items-center gap-2 text-sm font-bold text-text"><CheckCircle2 size={18} className="text-emerald-600" />Credential protection</div><p className="mt-2 text-xs leading-5 text-text-muted">API key server-এ encrypted করে রাখা হয়। প্রতিটি provider card নিজের Save button-এ আলাদাভাবে সংরক্ষণ হবে; পাশের key overwrite হবে না।</p></div>
        <ProviderCredentialsCard provider="OPENAI" title="OpenAI" description="OpenAI API key দিন। AI model হিসেবে OpenAI নির্বাচন করলে এই key ব্যবহার হবে।" fields={[{ name: "openaiApiKey", label: "OpenAI API key", hint: "platform.openai.com থেকে তৈরি করা key", placeholder: "sk-…", secret: true }]} settings={settings} canUpdate={canUpdate} formRef={openAiForm} onSaved={() => router.refresh()} />
        <ProviderCredentialsCard provider="GOOGLE_AI_STUDIO" title="Google AI Studio" description="Gemini model ব্যবহার করতে Google AI Studio API key configure করুন।" fields={[{ name: "googleAiStudioApiKey", label: "Google AI Studio API key", hint: "Google AI Studio থেকে তৈরি করা key", placeholder: "AIza…", secret: true }]} settings={settings} canUpdate={canUpdate} formRef={geminiForm} onSaved={() => router.refresh()} />
      </div>
    </section>

    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-700"><MessageSquareText size={19} /></span><div><h2 className="font-bold text-text">AI knowledge</h2><p className="text-xs text-text-muted">Customer-এর বাস্তব প্রশ্ন-উত্তর দিয়ে AI-কে শেখান।</p></div></div><Link href="/admin/ai/teach" className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-text hover:bg-background">Teachings খুলুন →</Link></div></section>

    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.08)] backdrop-blur sm:inset-x-auto sm:bottom-5 sm:right-6 sm:rounded-2xl sm:border sm:p-2"><button type="button" onClick={saveAll} disabled={!canUpdate || savingAll} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-700 px-5 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110 disabled:opacity-60 sm:min-w-48">{savingAll ? "সব save হচ্ছে…" : <><Save size={16} />Save all AI settings</>}</button></div>
  </main>;
}
