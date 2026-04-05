export default function Modal({
  isOpen,
  setIsOpen,
  children,
  title,
  openStyle = "right", // Default to right
}) {
  // Function to toggle the drawer state
  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  // Determine styles based on openStyle
  const positionStyles = {
    left: {
      container: `fixed left-0 top-4 w-80 h-screen z-50 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`,
      buttopPosition: `top-0 right-0`,
    },
    right: {
      container: `fixed right-0 top-4 w-80 h-screen z-50 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-96"
      }`,
      buttopPosition: `-top-2 -left-2`,
    },
    bottom: {
      // container: `fixed bottom-0 left-1/2 transform  transition-transform duration-500 ease-in-out z-50 max-w-md w-full    ${
      //   isOpen
      //     ? "-translate-x-1/2  bottom-1/2 "
      //     : "-translate-x-1/2 translate-y-96"
      // }`,
      container: `fixed  bottom-0 left-1/2 z-50 -translate-x-1/2 w-11/12  max-w-md transform transition-transform duration-300 ${
        isOpen ? "bottom-1/2 " : "translate-y-96"
      }`,
      buttopPosition: `-top-2 -left-2`,
    },
  };

  const selectedStyle = positionStyles[openStyle] || positionStyles.right;

  return (
    <div>
      {/* Overlay */}
      <div
        className={`fixed  inset-0 bg-brand dark:bg-slate-950 bg-opacity-10 dark:bg-opacity-50 z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleDrawer}
      ></div>

      {/* Drawer Content */}
      <div className={selectedStyle.container}>
        <div className="h-full z-50  bg-slate-100 dark:bg-slate-900 shadow-lg rounded-md dark:shadow-white">
          <button
            onClick={toggleDrawer}
            className={`absolute ${selectedStyle.buttopPosition} bg-red-500 hover:bg-red-600 text-2xl w-8 h-8 rounded-full focus:outline-none text-white`}
          >
            ✗
          </button>
          <div className="p-4 h-full">
            {title && (
              <h2 className="text-xl font-bold border-b-2 text-slate-900 dark:text-slate-200 tracking-wider">
                {title}
              </h2>
            )}
            {/* Drawer content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
