export default function DefaultInput({
  name,
  title,
  type,
  inputMode,
  pattern,
}) {
  return (
    <div className="relative my-3 ">
      <input
        inputMode={inputMode}
        pattern={pattern}
        type={type}
        name={name}
        id={name}
        className="block px-2.5 pb-2.5 pt-4 w-full  text-gray-900 bg-slate-400 border-2 border-slate-700 dark:bg-slate-600 rounded-lg border-1  appearance-none dark:text-white dark:border-slate-400 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:border-blue-500 peer"
        placeholder={" "}
      />
      <label
        htmlFor={name}
        className="absolute rounded-md text-gray-700 bg-slate-400 dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0]   px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-slate-200 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1"
      >
        {title}
      </label>
    </div>
  );
}
