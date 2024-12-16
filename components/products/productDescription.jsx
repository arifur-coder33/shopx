export default function ProductDescription({ description }) {
  return (
    <div>
      <div
        className="text-2xl ont-bold sm:text-4xl border-y-2 my-2 drop-shadow-sm items-center px-2
        bg-gradient-to-l from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-950"
      >
        পণ্যের বিবরণ:
      </div>
      <div
        className="rendered-html"
        dangerouslySetInnerHTML={{ __html: description }}
      ></div>
    </div>
  );
}
