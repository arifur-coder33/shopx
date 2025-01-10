export default function FloatingInput({ ...props }) {
  // const colSpan = 6;

  // {    name,
  //   label,
  //   type,
  //   inputMode,
  //   pattern,
  //   value,
  //   colSpan,}

  // inputMode={inputMode}
  // defaultValue={value}
  // pattern={pattern}
  // type={type}
  // name={name}
  // id={name}
  // autoComplete,
  return (
    <div className={`relative my-3  col-span-${props?.colSpan}`}>
      <input
        {...props}
        className="block px-1  pt-4 text-base bg-slate-200 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500  w-full p-2.5 dark:bg-slate-600 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500  appearance-none focus:outline-none focus:ring-2 peer"
        placeholder={" "}
        id={props?.name}
      />
      <label
        htmlFor={props?.name}
        className="absolute rounded-md text-slate-500 text-base bg-slate-200  dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0]   px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-slate-200 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1"
      >
        {props?.label}
      </label>
    </div>
  );
}
