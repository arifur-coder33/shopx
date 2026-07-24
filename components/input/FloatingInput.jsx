export default function FloatingInput({
  modal,
  label,
  name,
  inputType = "text",
  colSpan,
  required,
  isEditable,

  ...props
}) {
  const uniqueId = `input-${name}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  return (
    <div
      className={`relative my-4
      col-span-${colSpan}`}
    >
      <input
        disabled={isEditable === false}
        type={inputType}
        className="block px-1 text-xl pt-4  bg-slate-200 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500  w-full p-2.5 dark:bg-slate-600 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500  appearance-none focus:outline-none focus:ring-2 peer"
        id={uniqueId}
        name={name}
        placeholder=""
        {...props}
      />
      <label
        htmlFor={uniqueId}
        className="absolute rounded-md text-slate-500 text-2xl bg-slate-200  dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 origin-[0]   px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-slate-200 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}
