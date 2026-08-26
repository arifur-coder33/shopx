function RadioButton({ id, name, label, isSelected, onSelect, value }) {
  return (
    <div
      className={`relative p-1 py-2 px-2 rounded-xl ${
        isSelected
          ? "bg-cyan-500 shadow-lg shadow-cyan-500/50"
          : "bg-slate-400 dark:bg-slate-500 border-b-4 border-slate-600 dark:border-black"
      } cursor-pointer`}
      onClick={() => onSelect(id)}
    >
      <input
        hidden
        type="radio"
        id={id}
        value={id}
        name={name}
        checked={isSelected}
        onChange={() => onSelect(id)}
      />

      {/* Selected Tick */}
      {isSelected && (
        <span
          className="
            absolute
            -top-2
            -left-2
            flex items-center justify-center
            w-5 h-5
            rounded-full
            bg-white
            text-cyan-600
            text-[12px]
            font-black
            shadow-md
            ring-2 ring-cyan-400
            animate-[bounce_0.3s_ease-out]
            z-10
          "
        >
          ✓
        </span>
      )}

      <label htmlFor={id} className="cursor-pointer text-[12px] md:text-sm">
        {label}
      </label>
    </div>
  );
}

export default RadioButton;
