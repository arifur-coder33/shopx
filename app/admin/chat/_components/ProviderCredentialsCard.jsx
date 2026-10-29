"use client";

import { revealChatCredentialAction, saveProviderCredentialsAction } from "@/backend/serverActions/chatActions";
import { Copy, Eye, EyeOff, KeyRound, LoaderCircle, Save, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

const inputClass = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

export default function ProviderCredentialsCard({ provider, title, description, fields, settings, canUpdate, formRef, onSaved }) {
  const [values, setValues] = useState({});
  const [visible, setVisible] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");

  const reveal = async (name) => {
    if (visible[name]) return setVisible((current) => ({ ...current, [name]: false }));
    if (settings.configured?.[name] && values[name] === undefined) {
      const result = await revealChatCredentialAction(name);
      if (!result.success) return setNotice(result.message || "Credential দেখানো যায়নি।");
      setValues((current) => ({ ...current, [name]: result.data.value }));
    }
    setVisible((current) => ({ ...current, [name]: true }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!canUpdate || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await saveProviderCredentialsAction(provider, new FormData(event.currentTarget));
      setNotice(result.message || (result.success ? "Credentials সংরক্ষিত হয়েছে।" : "সংরক্ষণ করা যায়নি।"));
      if (result.success) onSaved?.();
    } catch { setNotice("সংরক্ষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"); }
    finally { setSaving(false); }
  };

  return <form ref={formRef} onSubmit={save} className="group relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-fuchsia-500 to-sky-500" />
    <div className="flex items-start gap-3 p-5 sm:p-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound size={20} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-text">{title}</h2><span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">{provider.replaceAll("_", " ")}</span></div>
        <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
      </div>
      <ShieldCheck className="mt-1 shrink-0 text-emerald-600" size={18} />
    </div>
    <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 sm:px-6 sm:pb-6">
      {fields.map((field) => {
        const secret = field.secret !== false;
        const configured = Boolean(settings.configured?.[field.name]);
        const value = values[field.name] ?? (!secret ? settings.publicCredentials?.[field.name] || "" : "");
        const inputId = `${provider}_${field.name}`;
        return <div key={field.name} className="block min-w-0">
          <label htmlFor={inputId} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">{field.label}{configured && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Saved</span>}</label>
          {field.hint && <span className="mt-0.5 block text-xs text-text-muted">{field.hint}</span>}
          {field.name === "webhookVerifyToken" && <span className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => { const bytes = crypto.getRandomValues(new Uint8Array(32)); const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); setGeneratedToken(token); setValues((current) => ({ ...current, webhookVerifyToken: token })); }} disabled={!canUpdate} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-background disabled:opacity-50"><Sparkles size={13} />Generate</button>
            <button type="button" onClick={async () => { const token = generatedToken || values.webhookVerifyToken; if (!token) return setNotice("প্রথমে token generate অথবা reveal করুন।"); try { await navigator.clipboard.writeText(token); setNotice("Token copy হয়েছে।"); } catch { setNotice("Token copy করা যায়নি।"); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-background"><Copy size={13} />Copy</button>
          </span>}
          <span className="relative mt-1 block">
            <input id={inputId} name={field.name} value={value} onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} type={secret && !visible[field.name] ? "password" : "text"} autoComplete="new-password" disabled={!canUpdate} placeholder={configured && secret && values[field.name] === undefined ? "••••••••••••  (আগের credential রাখা হবে)" : field.placeholder || "Value দিন"} className={inputClass} />
            {secret && <button type="button" onClick={() => reveal(field.name)} disabled={!canUpdate} aria-label={visible[field.name] ? `${field.label} hide` : `${field.label} reveal`} className="absolute right-2 top-2.5 rounded-lg p-1.5 text-text-muted hover:bg-background disabled:opacity-50">{visible[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
          </span>
          {configured && <label className="mt-2 inline-flex items-center gap-2 text-xs text-text-muted"><input type="checkbox" name={`clear_${field.name}`} value="true" disabled={!canUpdate} className="accent-primary" />Saved credential মুছুন</label>}
        </div>;
      })}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/50 px-5 py-3 sm:px-6">
      <p aria-live="polite" className="min-h-5 text-xs text-text-muted">{notice}</p>
      {canUpdate && <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}{saving ? "Saving…" : `Save ${title}`}</button>}
    </div>
  </form>;
}
