import Cart from "./Cart";
import ThemeToggle from "./TheamToggle";

export default function NavBar() {
  return (
    <>
      <div className="md:fixed sticky top-0 opacity-60 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-slate-900 via-purple-400 to-slate-900 shadow-sm shadow-slate-200 p-2">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className="text-5xl font-bold text-orange-700 ">আমার শপ</div>
          <div className="flex flex-row justify-end items-center">
            <ThemeToggle />
            <Cart />
          </div>
        </div>
      </div>
    </>
  );
}
