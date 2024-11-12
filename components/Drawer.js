// components/Drawer.js

import KalapanaFont from "./KalapanaFont";

export default function Drawer({ isOpen, setIsOpen,children ,title}) {
  // Function to toggle the drawer state
  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-purple dark:bg-slate-950 bg-opacity-10 dark:bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleDrawer}
      ></div>

      {/* Drawer Content */}
      <div
        className={`fixed right-0 top-4 w-80 h-screen bg-gray-100 border-2 border-gray-500 dark:bg-slate-900 shadow-lg z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          onClick={toggleDrawer}
          className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-2xl w-10 h-10 rounded-full focus:outline-none text-white"
        >
          ✗
        </button>
        <div className="p-4">
          {/* <h2 className="text-xl font-bold border-b-2 text-slate-900 dark:text-slate-200 tracking-wider"><KalapanaFont>{title}</KalapanaFont></h2> */}

          {/* Add your drawer content here */}
          {children}
        </div>
      </div>
    </div>
  );
}
