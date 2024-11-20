export default async function CheckOutPage(props) {
  const { p } = await props.searchParams;
  return (
    <div className="pt-4">
      <div className="flex md:flex-nowrap flex-wrap-reverse  ">
        <div className="w-full md:w-1/2">Product Details</div>
        <div className="w-full md:w-1/2">
          <form className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                id="floating_outlined"
                className="block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-white dark:bg-slate-600 rounded-lg border-1 border-purple-500 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-slate-200 focus:outline-none focus:ring-1 focus:border-slate-200 peer"
                placeholder=" "
              />
              <label
                htmlFor="floating_outlined"
                className="absolute rounded-md text-gray-500 bg-white dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0]   px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-slate-200 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1"
              >
                আপনার নামঃ
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
