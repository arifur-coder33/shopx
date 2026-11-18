"use client";

import { useState } from "react";

const guides = {
  dashboard: {
    title: "হিসাবের ড্যাশবোর্ড ও Money Accounts",
    summary: "ব্যবসার টাকা কোন account‑এ আছে, কোথা থেকে এসেছে বা কোথায় গেছে—এখানে তার balance ও সামগ্রিক হিসাব দেখুন।",
    steps: ["একটি physical cashbox, bank বা mobile wallet-এর জন্য আলাদা Money Account তৈরি করুন।", "Account-এর opening balance থাকলে সেটি Fund Add দিয়ে সঠিক source/shareholder উল্লেখ করে যোগ করুন।", "দুই account-এর মধ্যে টাকা সরালে Money Movement → Transfer ব্যবহার করুন।", "Supplier payment ও expense তাদের নিজস্ব Accounts page থেকে record করুন; একই লেনদেন আবার Money Movement হিসেবে দেবেন না।", "General Ledger খুলে journal debit-credit ও account-wise balance মিলিয়ে দেখুন।"],
    flow: ["Money Account", "Receipt / payment / expense", "Journal entry", "Balance + report"],
    risks: ["ভুল source/destination account দিলে account balance এবং financial report ভুল হবে।", "বাস্তবে টাকা না পাঠিয়ে transfer বা payment record করলে app-এর balance বাস্তব balance থেকে আলাদা হবে।", "Money Account balance ও Financial Ledger balance আলাদা হিসাব; একটিকে দেখে অন্যটি ঠিক আছে ধরে নেবেন না।"],
  },
  ledger: {
    title: "General Ledger ও Debit-Credit summary",
    summary: "প্রতিটি posted journal entry-তে মোট Debit ও Credit সমান থাকা double-entry হিসাবের নিয়ম।",
    steps: ["সমস্ত হিসাব দেখতে date/reference filter খালি রেখে Account Ledger দেখুন।", "Debit-credit check-এ মোট debit, মোট credit এবং difference মিলিয়ে নিন।", "Account-wise table-এ কোন account-এ net debit বা credit আছে দেখুন।", "Liability সাধারণত credit balance; negative/debit balance হলে ওই liability account-এর entry খতিয়ে দেখুন।", "Goods Receipt payable বাড়ায়; Supplier Payment payable কমায়—Reference type ও date filter দিয়ে সংশ্লিষ্ট entry খুঁজুন।"],
    flow: ["Source document", "Debit + Credit journal lines", "Account-wise net balance", "Reconcile"],
    risks: ["Date/reference filter থাকলে summary শুধু matching entry-র; পুরো account balance জানতে filter সরান।", "Debit-credit মোট সমান হলেও ভুল account-এ entry হলে account balance ভুল থাকতে পারে।", "Manual stock adjustment-এর stock valuation dashboard-এ বদলাতে পারে, কিন্তু সেটি আলাদা GL journal নাও তৈরি করতে পারে।"],
  },
  payments: {
    title: "Supplier Payment, Advance ও Ledger",
    summary: "Received goods-এর bill পরিশোধ করুন, অথবা goods আসার আগে advance আলাদা রাখুন।",
    steps: ["Pending payment-এ Received value, Pending receive value, Previously paid এবং Current due যাচাই করুন।", "Received bill-এর জন্য PO Payment দিন; Partial payment করতে Current due-এর চেয়ে কম amount লিখুন, পুরোটা দিতে Full payment চাপুন।", "Goods receive হওয়ার আগে supplier-কে টাকা দিলে Advance Payment বেছে supplier, amount, source account, date ও reference লিখুন। Advance Accounts-এ Supplier Advances asset হিসেবে থাকবে, payable হবে না।", "পরে Goods Receipt ও bill তৈরি হলে Available advance থেকে ওই supplier-এর received PO বেছে যতটুকু দরকার Apply করুন। একই advance একাধিক bill-এ ভাগ করা যায়।", "Supplier আগের unallocated advance-এর টাকা ফেরত দিলে Supplier refund দিয়ে কোন account-এ টাকা এসেছে তা লিখুন। Refund available advance-এর বেশি হতে পারবে না।", "Supplier Ledger খুলে Opening balance, purchase bill, payment, advance, adjustment, refund, current due ও available advance মিলিয়ে দেখুন।"],
    flow: ["Purchase Order", "Goods Receipt → Bill payable", "PO Payment অথবা Supplier Advance", "Advance apply to received bill", "Supplier Ledger"],
    risks: ["Pending receive value payable নয়; supplier-কে আগেই দিলে সেটি Advance Payment হিসেবে record করুন।", "ভুল supplier/PO বাছলে advance অন্য bill-এ সমন্বয় হবে।", "একই টাকা regular payment এবং advance দুইভাবেই record করলে cash ও হিসাব double count হবে।", "Advance apply করলে cash আরেকবার কমে না; শুধু advance asset ও payable সমন্বয় হয়।", "Bill refund বা returned goods-এর টাকা এই advance refund field-এ দেবেন না; এটি শুধু available unallocated advance ফেরত নেওয়ার জন্য।"],
  },
  expenses: {
    title: "Expenses",
    summary: "ব্যবসার খরচ যে account থেকে পরিশোধ হয়েছে, সেটির সঙ্গে category ও supporting details record করুন।",
    steps: ["খরচের ধরন মেলে এমন category বাছুন; না থাকলে আগে category তৈরি করুন।", "সঠিক amount, date ও Pay from account দিন।", "চেনা যায় এমন reference/বিবরণ লিখুন।", "Purchase Order-এর আলাদা freight বা delivery charge হলে শুধু তখন PO link করুন।", "Expense history ও General Ledger-এ expense এবং source account-এর journal দেখুন।"],
    flow: ["Expense details", "Expense / inventory debit", "Money Account credit", "Ledger"],
    risks: ["সাধারণ operating expense-কে PO-তে link করলে সেটি inventory cost হিসেবে গণ্য হতে পারে।", "একই খরচ দুইবার record করলে expense ও cash/bank balance দুটোই ভুল হবে।", "ভুল category হলে profit report ভুল দেখাবে।"],
  },
  shareholders: {
    title: "Shareholders ও Owner Capital",
    summary: "Shareholder-এর পরিচয় ও ব্যবসায় জমা/তোলা অর্থের reference রাখার জায়গা।",
    steps: ["প্রতিটি owner-এর নাম, যোগাযোগ ও প্রযোজ্য share percentage দিন।", "Shareholder থেকে টাকা এলে Fund Add-এ সঠিক shareholder যুক্ত করুন।", "Owner টাকা তুললে Withdrawal-এ সংশ্লিষ্ট shareholder দিন।", "Shareholder page-এ deposit, withdrawal ও net capital মিলিয়ে দেখুন।"],
    flow: ["Shareholder", "Fund Add / Withdrawal", "Capital journal", "Net contribution"],
    risks: ["Share percentage মালিকানার হার; এটি নিজে থেকে account balance বা capital contribution তৈরি করে না।", "ভুল shareholder যুক্ত করলে owner-wise contribution ভুল হবে।", "বাস্তব ব্যাংক লেনদেন না মিলিয়ে withdrawal record করবেন না।"],
  },
  refunds: {
    title: "Refund Disbursement",
    summary: "অনুমোদিত return/refund বাস্তবে পাঠানোর পর source business account থেকে payout record করুন।",
    steps: ["Approved refund ও order amount যাচাই করুন।", "Customer-এর refund destination নিশ্চিত করুন।", "যে business account থেকে টাকা পাঠিয়েছেন সেটি বাছুন।", "External transaction reference লিখে payout complete করুন।", "Account Ledger-এ refund journal এবং সংশ্লিষ্ট source account দেখুন।"],
    flow: ["Approved refund", "বাস্তব payout", "Source account debit", "Refund journal"],
    risks: ["এই feature bank বা mobile wallet-এ টাকা পাঠায় না; payout আগে বাস্তবে সম্পন্ন করতে হয়।", "ভুল destination বা amount হলে customer-কে ভুল টাকা যেতে পারে।", "ভুল source account বাছলে app balance বাস্তব account balance-এর সঙ্গে মিলবে না।"],
  },
};

export default function AccountGuide({ feature = "dashboard" }) {
  const [open, setOpen] = useState(false);
  const guide = guides[feature] || guides.dashboard;
  return <><button type="button" onClick={() => setOpen(true)} aria-label={`${guide.title} বাংলা সহায়িকা`} title="এই পেজের হিসাব ও ব্যবহার বুঝুন" className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 text-sm font-semibold text-primary hover:bg-primary/10"><span className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs">i</span>বাংলা গাইড</button>{open&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}><section role="dialog" aria-modal="true" aria-labelledby="account-guide-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 text-text shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Accounts বাংলা সহায়িকা</p><h2 id="account-guide-title" className="mt-1 text-2xl font-bold">{guide.title}</h2><p className="mt-2 text-text-muted">{guide.summary}</p></div><button type="button" autoFocus onClick={()=>setOpen(false)} aria-label="সহায়িকা বন্ধ করুন" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-xl">×</button></div><div className="mt-5 rounded-xl border border-border bg-surface-muted/50 p-4"><h3 className="font-bold">কীভাবে ব্যবহার করবেন</h3><ol className="mt-2 list-decimal space-y-2 pl-5">{guide.steps.map((step,index)=><li key={index}>{step}</li>)}</ol></div><div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4"><h3 className="font-bold">হিসাবের ধারা</h3><div className="mt-3 flex flex-wrap items-center gap-2">{guide.flow.map((step,index)=><div key={step} className="flex items-center gap-2"><span className="rounded-lg border border-primary/30 bg-surface px-3 py-2 text-center text-sm font-semibold">{step}</span>{index<guide.flow.length-1&&<span aria-hidden="true" className="font-bold text-primary">→</span>}</div>)}</div></div><div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"><h3 className="font-bold">ভুল হলে কী সমস্যা হতে পারে</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">{guide.risks.map((risk,index)=><li key={index}>{risk}</li>)}</ul></div><button type="button" onClick={()=>setOpen(false)} className="button mt-5 min-h-11 w-full">বুঝেছি</button></section></div>}</>;
}
