export default function DefaultInput({ mode, data, inputHandler, item }) {
  // console.log(mode)
  // console.log(`item`)
  // console.log(item)

  return (
    <>
      <label
        className="pl-1 block uppercase tracking-wide text-gray-700 dark-text text-xs font-bold "
        htmlFor="grid-sub-districe"
      >
        {item?.labelName}{" "}
        {item?.required && <span className="text-red-600">*</span>}
      </label>

      <input
        step={item?.inputType === "number" ? "any" : "false"}
        name={item?.inputName}
        defaultValue={mode === "edit" && data ? data[item?.inputName] : ""}
        onChange={(e) => inputHandler(e)}
        type={item?.inputType}
        required={item?.required}
        className={`p-2  focus:border-green-500 focus:ring-1 focus:ring-green-500  appearance-none block w-full  dark:bg-slate-700 bg-gray-200 text-gray-700 dark:text-slate-300 border  rounded   leading-tight focus:outline-none focus:bg-white focus:dark:bg-slate-900`}
        placeholder={`Enter ${item?.labelName}`}
      ></input>
    </>
  );
}
