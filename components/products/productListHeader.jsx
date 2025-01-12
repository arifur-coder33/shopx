import Link from "next/link";

export default function ProductListHeader({ headerName, linkName, link }) {
  return (
    <>
      <div
        className="flex justify-between border-y-2 my-2 drop-shadow-sm items-center px-2
        bg-gradient-to-l from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-950 
        
        x-2
      text-xl sm:text-2xl lg:text-3xl
      "
      >
        <div className="">{headerName}</div>
     {link &&    <Link
          className="underline  hover:text-green-500
          text-sm sm:text-md lg:text-xl
        "
          href={link}
        >
          {linkName}
        </Link>}
      </div>
    </>
  );
}
