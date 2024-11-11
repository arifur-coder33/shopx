import { useEffect, useRef, useState } from "react";

export default function ModalLay({
  children,
  modalName,
  submitForm,
  status,
  closeModal,
  width,
}) {
  //State Declare
  const [overLayHide, setOverLayHide] = useState("hidden");
  const [opacity, setOpacity] = useState("opacity-0");
  const [translate, setTranslate] = useState("-translate-y-full");
  const [scale, setScale] = useState("scale-150");
  /// Onload scroll top

  const openModal = async () => {
    if (status) {
      setOverLayHide("");
      setTimeout(() => {
        setOpacity("");
        setTranslate("");
        setScale("");
      }, 100);
    } else {
      // modalCl.add('-translate-y-full')
      setTranslate("-translate-y-full");
      setTimeout(() => {
        setOpacity("opacity-0");
        setScale("scale-150");
      }, 100);

      setTimeout(() => {
        setOverLayHide("hidden");
      }, 300);
    }
  };
  /// Onload Scroll to top function
  const divRef = useRef(null);
  const scrollToTop = () => {
    if (divRef.current) {
      divRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    openModal();
    scrollToTop();
  }, [status]);

  return (
    <>
      <div>
        {/* overlay */}
        <div
          id="modal_overlay"
          className={` ${overLayHide} m-auto max-w-screen-2xl fixed inset-0 bg-black dark:bg-white dark:bg-opacity-30 bg-opacity-30 h-screen w-full flex justify-center items-start md:items-center pt-10 md:pt-0 pb-2  z-50`}
        >
          {/* modal */}
          <div
            id="modal"
            className={`${opacity} transform ${translate} ${scale} dark:bg-slate-800  dark:border-2 dark:border-gray-600   m-auto max-w-screen-xl   relative w-11/12 ${
              width ? width : "md:w-1/2"
            } max:h-screen h-fit  md:h-fit bg-white rounded shadow-2xl   transition-transform duration-300 `}
          >
            {/* button close */}
            <button
              onClick={closeModal}
              className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-2xl w-10 h-10 rounded-full focus:outline-none text-white"
            >
              ✗
            </button>
            {/* header */}
            <div className="px-4 py-1 sm:py-3 border-b border-gray-200 ">
              <h2 className="text-md sm:text-xl font-semibold text-gray-600 dark:text-slate-200">
                {modalName}
              </h2>
            </div>
            {/* body */}

            <section
              ref={divRef}
              className="w-full h-full  max-h-[calc(100vh-7rem)]  overflow-y-scroll
           sm:p-3"
            >
              {children}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
