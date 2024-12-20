export default function Button({
  children,
  onClick,
  bgcolor,
  textColor,
  className,
  disabled,
  type,
}) {
  return (
    <button
      type={type || "button"}
      disabled={disabled}
      aria-label="button"
      onClick={onClick}
      className={`button ${bgcolor}  ${textColor} ${className} ${
        disabled && "opacity-50"
      }`}
    >
      {children}
    </button>
  );
}
