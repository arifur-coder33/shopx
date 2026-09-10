// components/Drawer.js

export default function Drawer({
  isOpen,
  setIsOpen,
  children,
  title,
  modalStyles,
}) {
  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div aria-hidden={!isOpen}>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleDrawer}
      />

      {/* Drawer Content */}

      <div
        className={`fixed inset-y-0 right-0 z-50 h-dvh w-80 max-w-[calc(100vw-1rem)] transform-gpu transition-transform duration-300 ease-out will-change-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="h-full overflow-hidden bg-surface shadow-2xl"
        >
          <button
            type="button"
            aria-label="বন্ধ করুন"
            onClick={toggleDrawer}
            className="absolute left-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-danger text-xl text-white transition-opacity hover:opacity-90 focus:outline-none"
          >
            ✗
          </button>
          <div className="h-full overflow-y-auto p-2 pt-14">
            {/* <h2 className="text-xl font-bold border-b-2 text-slate-900 dark:text-slate-200 tracking-wider"><KalapanaFont>{title}</KalapanaFont></h2> */}

            {/* Add your drawer content here */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
