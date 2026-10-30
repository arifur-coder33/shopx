"use client";

import { saveChatChannelSectionAction, saveProviderCredentialsAction } from "@/backend/serverActions/chatActions";
import ProviderCredentialsCard from "./ProviderCredentialsCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, Copy, Globe2, MessageCircle, Save, ShieldCheck, Store, Webhook } from "lucide-react";

const fieldClass = "mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

export default function ChatSettingsForm({ settings, canUpdate, webhookUrl, tiktokWebhookUrl, encryptionReady }) {
  const router = useRouter();
  const chatForm = useRef(null);
  const metaForm = useRef(null);
  const tiktokForm = useRef(null);
  const [savingAll, setSavingAll] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");

  const copyValue = async (value, label) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 1800); }
    catch { setNotice("Clipboard access পাওয়া যায়নি।"); }
  };

  const saveChat = async (event) => {
    event.preventDefault();
    if (!canUpdate) return;
    setNotice("");
    try {
      const result = await saveChatChannelSectionAction(new FormData(event.currentTarget));
      setNotice(result.message || (result.success ? "Chat settings save হয়েছে।" : "Save করা যায়নি।"));
      if (result.success) router.refresh();
    } catch { setNotice("Chat settings save ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"); }
  };

  const saveAll = async () => {
    if (!canUpdate || savingAll) return;
    setSavingAll(true);
    setNotice("");
    const tasks = [
      () => saveProviderCredentialsAction("META", new FormData(metaForm.current)),
      () => saveProviderCredentialsAction("TIKTOK", new FormData(tiktokForm.current)),
      () => saveChatChannelSectionAction(new FormData(chatForm.current)),
    ];
    try {
      for (const task of tasks) {
        const result = await task();
        if (!result.success) {
          setNotice(result.message || "সব Chat settings save করা যায়নি।");
          return;
        }
      }
      setNotice("Chat settings ও provider credentials সব save হয়েছে.");
      router.refresh();
    } catch { setNotice("Save all ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"); }
    finally {
      setSavingAll(false);
    }
  };

  const channels = [
    ["websiteChatEnabled", "Website chat", "সাইটের chat widget", settings.websiteChatEnabled, Globe2, "sky"],
    ["whatsappEnabled", "WhatsApp", "WhatsApp inbox ও auto reply", settings.whatsappEnabled, MessageCircle, "emerald"],
    ["messengerEnabled", "Messenger", "Facebook Page inbox", settings.messengerEnabled, MessageCircle, "blue"],
    ["instagramEnabled", "Instagram", "Instagram DM inbox", settings.instagramEnabled, MessageCircle, "pink"],
    ["tiktokEnabled", "TikTok", "TikTok Business messages", settings.tiktokEnabled, MessageCircle, "slate"],
  ];
  const channelIconColors = { sky: "bg-sky-500/10 text-sky-700", emerald: "bg-emerald-500/10 text-emerald-700", blue: "bg-blue-500/10 text-blue-700", indigo: "bg-indigo-500/10 text-indigo-700", pink: "bg-pink-500/10 text-pink-700", slate: "bg-slate-500/10 text-slate-700" };

  return <main className="mx-auto w-full max-w-6xl space-y-6 pb-28">
    <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800 p-6 text-white shadow-lg sm:p-9">
      <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><Store size={14} />CHANNEL CONTROL CENTER</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Chat Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Inbox channel, order flow ও webhook setup configure করুন। AI provider ও reply style আলাদা AI Settings page-এ আছে।</p></div>
        <Link href="/admin/ai/settings" className="w-fit rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold transition hover:bg-white/20">AI Settings →</Link>
      </div>
    </header>

    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${encryptionReady ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><ShieldCheck className={`mt-0.5 shrink-0 ${encryptionReady ? "text-emerald-600" : "text-amber-600"}`} size={20} /><div><p className="text-sm font-bold text-text">{encryptionReady ? "Credentials encrypted" : "Encryption key required"}</p><p className="mt-1 text-xs leading-5 text-text-muted">{encryptionReady ? "Provider credentials encrypted অবস্থায় database-এ থাকবে। প্রতিটি provider card আলাদা করে save করা যাবে।" : "Credentials save করতে server-এ PROVIDER_CREDENTIAL_ENCRYPTION_KEY কমপক্ষে 32 অক্ষরের হতে হবে।"}</p></div></div>

    <form ref={chatForm} onSubmit={saveChat} className="space-y-6">
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-text">Channels & order flow</h2><p className="mt-1 text-xs leading-5 text-text-muted">যে channel connect করা আছে সেটি চালু করুন; প্রতিটি channel-এর credential নিচের provider card-এ রাখুন। AI কোন channel-এ উত্তর দেবে, সেটি AI Settings-এ বাছাই করুন।</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">5 channels</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{channels.map(([name, title, subtitle, checked, Icon, color]) => <label key={name} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${channelIconColors[color]}`}><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-text">{title}</span><span className="mt-0.5 block text-xs text-text-muted">{subtitle}</span></span><input name={name} type="checkbox" defaultChecked={checked} disabled={!canUpdate} className="h-5 w-5 shrink-0 accent-primary" /></label>)}</div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"><span><span className="block text-sm font-bold text-text">Chat থেকে order তৈরি</span><span className="mt-1 block text-xs text-text-muted">বন্ধ করলে chat শুধু contact তথ্য সংগ্রহ করবে।</span></span><input name="chatOrderCreationEnabled" type="checkbox" defaultChecked={settings.chatOrderCreationEnabled} disabled={!canUpdate} className="h-5 w-5 accent-primary" /></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="block"><span className="text-sm font-bold text-text">Website welcome message</span><input name="welcomeMessage" defaultValue={settings.welcomeMessage || ""} maxLength={300} disabled={!canUpdate} placeholder="আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?" className={fieldClass} /></label><label className="block"><span className="text-sm font-bold text-text">WhatsApp template language</span><input name="whatsappTemplateLanguage" defaultValue={settings.whatsappTemplateLanguage || "bn"} maxLength={35} disabled={!canUpdate} placeholder="bn / en_US" className={fieldClass} /></label></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><label className="block"><span className="text-sm font-bold text-text">WhatsApp text fallback template</span><input name="whatsappTextTemplateName" defaultValue={settings.whatsappTextTemplateName || ""} maxLength={512} disabled={!canUpdate} placeholder="approved_text_reply" className={fieldClass} /></label><label className="block"><span className="text-sm font-bold text-text">WhatsApp image fallback template</span><input name="whatsappImageTemplateName" defaultValue={settings.whatsappImageTemplateName || ""} maxLength={512} disabled={!canUpdate} placeholder="approved_product_image" className={fieldClass} /></label></div>
        <p className="mt-2 text-xs leading-5 text-text-muted">Templateগুলো WhatsApp Manager-এ আগে approve থাকতে হবে। Text template-এ body-এর <code>{"{{1}}"}</code> variable এবং image template-এ IMAGE header ও body variable লাগবে।</p>
        <label className="mt-5 block"><span className="text-sm font-bold text-text">Saved shortcut replies</span><span className="mt-1 block text-xs text-text-muted">প্রতি লাইনে /shortcut=reply লিখুন।</span><textarea name="quickReplies" rows={4} defaultValue={(settings.quickReplies || []).map((item) => `/${item.shortcut}=${item.text}`).join("\n")} disabled={!canUpdate} placeholder="/hello=আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?" className={fieldClass} /></label>
        <p className="mt-4 rounded-xl bg-blue-500/5 p-3 text-xs leading-5 text-text-muted">Facebook comment reply-এর জন্য Page webhook-এ <code>feed</code> subscribe করুন। Comment public reply ও inbox private reply-র জন্য আলাদা permission প্রয়োজন হয়।</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p aria-live="polite" className="text-xs text-text-muted">{notice}</p>{canUpdate && <button type="submit" className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-500/15"><Save size={16} />Save channel settings</button>}</div>
      </section>
    </form>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
      <div className="space-y-5">
        <ProviderCredentialsCard provider="META" title="Meta · Facebook, WhatsApp & Instagram" description="Instagram DM ও Messenger linked Facebook Page-এর একই Page ID এবং Page Access Token ব্যবহার করে। Meta app-এ Instagram API → API setup with Facebook Login বেছে নিন। Instagram Professional Account ID আলাদা; Instagram Login token এখানে লাগবে না। Credentials encrypted থাকবে; field ফাঁকা রেখে save করলে আগের value থাকবে।" fields={[
          { name: "whatsappPhoneNumberId", label: "WhatsApp Phone Number ID", hint: "WhatsApp Cloud API Setup" , secret: false },
          { name: "whatsappAccessToken", label: "WhatsApp Access Token", hint: "System User বা approved access token" },
          { name: "messengerPageId", label: "Facebook Page ID", hint: "Messenger ও Page comments-এর Page ID", secret: false },
          { name: "messengerPageAccessToken", label: "Page Access Token", hint: "Linked Facebook Page token; Messenger ও Instagram দুটোতেই ব্যবহৃত হবে" },
          { name: "instagramAccountId", label: "Instagram Professional Account ID", hint: "Facebook Page-এর সঙ্গে linked Instagram account ID", secret: false },
          { name: "metaAppSecret", label: "Meta App Secret", hint: "Meta App Settings → Basic" },
          { name: "webhookVerifyToken", label: "Webhook Verify Token", hint: "নিজের secret phrase; Meta dashboard-এ একই token দিন" },
          { name: "graphApiVersion", label: "Graph API Version", hint: "যেমন v26.0", secret: false },
        ]} settings={settings} canUpdate={canUpdate} formRef={metaForm} onSaved={() => router.refresh()} />
        <ProviderCredentialsCard provider="TIKTOK" title="TikTok Business Messaging" description="TikTok Business Messaging API access ও webhook authorization-এর keys রাখুন। TikTok-এর approval লাগতে পারে।" fields={[
          { name: "tiktokBusinessId", label: "TikTok Business ID", hint: "Authorization-এর open_id", secret: false },
          { name: "tiktokClientKey", label: "TikTok Client Key", hint: "TikTok developer app", secret: false },
          { name: "tiktokAccessToken", label: "TikTok Access Token", hint: "Business Messaging token" },
          { name: "tiktokClientSecret", label: "TikTok Client Secret", hint: "Webhook signature verification key" },
        ]} settings={settings} canUpdate={canUpdate} formRef={tiktokForm} onSaved={() => router.refresh()} />
      </div>
      <aside className="space-y-4">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-700"><Webhook size={19} /></span><div><h2 className="font-bold text-text">Webhook endpoints</h2><p className="text-xs text-text-muted">Meta app-এ configure করুন।</p></div></div><div className="mt-5 space-y-4"><div><label className="text-xs font-bold text-text">Meta callback URL</label><div className="mt-1 flex gap-2"><input readOnly value={webhookUrl} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-text" /><button type="button" onClick={() => copyValue(webhookUrl, "meta")} className="rounded-xl border border-border px-3 text-text hover:bg-background">{copied === "meta" ? <CheckCircle2 size={16} /> : <Copy size={16} />}</button></div></div><div><label className="text-xs font-bold text-text">TikTok callback URL</label><div className="mt-1 flex gap-2"><input readOnly value={tiktokWebhookUrl} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-text" /><button type="button" onClick={() => copyValue(tiktokWebhookUrl, "tiktok")} className="rounded-xl border border-border px-3 text-text hover:bg-background">{copied === "tiktok" ? <CheckCircle2 size={16} /> : <Copy size={16} />}</button></div></div></div><a className="mt-4 inline-block text-sm font-bold text-primary hover:underline" href="https://developers.facebook.com/" target="_blank" rel="noreferrer">Meta for Developers ↗</a><a className="mt-2 block text-sm font-bold text-primary hover:underline" href="https://business-api.tiktok.com/portal/bm-api/education-hub" target="_blank" rel="noreferrer">TikTok Business docs ↗</a></div>
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5"><h3 className="text-sm font-bold text-text">Connection checklist</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-text-muted"><li>• আগে সংশ্লিষ্ট provider card-এ credentials save করুন।</li><li>• এরপর channel enable করে channel settings save করুন।</li><li>• Save all button সব card ও channel settings ধারাবাহিকভাবে save করবে।</li></ul></div>
      </aside>
    </section>

    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.08)] backdrop-blur sm:inset-x-auto sm:bottom-5 sm:right-6 sm:rounded-2xl sm:border sm:p-2"><button type="button" onClick={saveAll} disabled={!canUpdate || savingAll} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-700 to-indigo-700 px-5 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110 disabled:opacity-60 sm:min-w-52">{savingAll ? "সব save হচ্ছে…" : <><Save size={16} />Save all Chat settings</>}</button></div>
  </main>;
}
