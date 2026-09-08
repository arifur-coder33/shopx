import { CreditCard, ShieldCheck, Truck } from "lucide-react";

export default function DeliveryInfo() {
  return (
    <section className="mt-4 grid grid-cols-1 gap-2 text-base sm:grid-cols-3 sm:gap-3" aria-label="ডেলিভারি সুবিধা">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="shrink-0 rounded-full bg-blue-50 p-2 text-blue-600">
          <Truck size={20} />
        </div>

        <div>
          <p className="font-semibold text-text">দ্রুত ডেলিভারি</p>
          <p className="text-xs text-text-muted">২–৫ দিনের মধ্যে ডেলিভারি</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="shrink-0 rounded-full bg-indigo-50 p-2 text-indigo-600">
          <CreditCard size={20} />
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-text">
            <span className="mr-1 text-xl font-bold text-danger">১</span>
            টাকাও আগে দিতে হবে না
          </p>
          <p className="text-xs text-text-muted">
            রাইডারের সামনে প্রোডাক্ট চেক করে টাকা দিবেন।
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="shrink-0 rounded-full bg-green-50 p-2 text-green-600">
          <ShieldCheck size={20} />
        </div>

        <div>
          <p className="font-semibold text-text">সহজ রিটার্ন</p>
          <p className="text-xs text-text-muted">
            পণ্য কোন সমস্যা থাকলে খুব সহজেই রিটার্ন করুন।
          </p>
        </div>
      </div>
    </section>
  );
}
