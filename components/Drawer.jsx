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
    <div className="">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-red-500 dark:bg-slate-950  dark:bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleDrawer}
      ></div>

      {/* Drawer Content */}

      <div
        className={`fixed right-0 top-4 w-80   h-screen  z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-96"
        }`}
      >
        <div
          className={`   h-[calc(100vh_-_20px)]  bg-slate-100   dark:bg-slate-900 shadow-lg rounded-md dark:shadow-white`}
        >
          <button
            onClick={toggleDrawer}
            className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-2xl w-8 h-8 rounded-full focus:outline-none text-white"
          >
            ✗
          </button>
          <div className="p-2 h-full">
            {/* <h2 className="text-xl font-bold border-b-2 text-slate-900 dark:text-slate-200 tracking-wider"><KalapanaFont>{title}</KalapanaFont></h2> */}

            {/* Add your drawer content here */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
