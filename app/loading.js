import Image from "next/image";

export default function Loading() {
  // Or a custom loading skeleton component
  return (
    <div className="w-screen h-screen flex flex-auto items-center justify-center relative">
 <Image src={"/favicon-32x32.png"} height={32} width={32} alt="logo"/>
 <p className="text-4xl absolute bottom-10">bdMart24</p>
 
  </div>
  )
}
