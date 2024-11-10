export default function Button({
  children,
  onClick,
  bgcolor,
  textColor,
  className,
}) {
  return (
    <button
      aria-label="button"
      onClick={onClick}
      className={`button ${bgcolor}  ${textColor} ${className}`}
    >
      {children}
    </button>
  );
}
