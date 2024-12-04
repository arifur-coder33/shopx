function RadioButton({ id, name, label, isSelected, onSelect, value }) {
  return (
    <div
      className={`p-1 py-2 px-2 rounded-xl ${
        isSelected
          ? "bg-green-500 dark:bg-slate-800 shadow-inner border-4 dark:border-green-700 "
          : "bg-slate-400 dark:bg-slate-500 border-b-4 border-slate-600 dark:border-black    "
      } cursor-pointer`}
      onClick={() => onSelect(id)}
    >
      <input
        type="radio"
        id={id}
        value={id}
        name={name}
        className="mr-1"
        checked={isSelected}
        onChange={() => onSelect(id)}
      />
      <label htmlFor={id} className="cursor-pointer">
        {label}
      </label>
    </div>
  );
}

export default RadioButton;
