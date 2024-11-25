import { registrationAction } from "@/app/backend/serverActions/authActions";
import BackButton from "@/components/BackButton";
import Button from "@/components/button";
import DefaultInput from "@/components/input/DefaultInput";
import KalapanaFont from "@/components/KalapanaFont";
import Link from "next/link";

export default  function RegisterPage() {
 async function test(formData){ 
  'use server'
try {
  await registrationAction(formData)
} catch (error) {
  console.log(error)
}
 }
  return (
    <div className="w-full mx-auto bg-slate-700 ">
      <div className=" mx-6 md:max-w-xs md:mx-auto flex items-center justify-center min-h-screen">
        <div className="relative w-full bg-slate-900 p-8 rounded-2xl shadow-xl shadow-purple-500 mt-16">
          <div className="flex flex-row gap-2 items-center justify-center text-4xl  w-full absolute -top-16  left-0">
            <div className=" h-28 w-28 flex items-center text-center justify-center rounded-full  bg-gray-700 text-purple-500 font-bold border-b-4 border-l-4 border-r-4 border-purple-500 shadow-inner m-2 ring-purple-500">
              <KalapanaFont>নতুন নিবন্ধন</KalapanaFont>
            </div>
          </div>
          <BackButton />
          <form action={test}>
            
            <div className="grid grid-cols-12  gap-2"></div>
            <DefaultInput
              colSpan={"cols-span-1"}
              name={"name"}
              label={"আপনার নাম"}
              placeholder={"আপনার নাম দিন।"}
              required={true}
              type={"name"}
            />

            <DefaultInput
              colSpan={"cols-span-1"}
              name={"email"}
              label={"ইমেইলঃ"}
              placeholder={"আপনার ইমেইল দিন।"}
              required={true}
              type={"email"}
            />
            <DefaultInput
              colSpan={"cols-span-1"}
              name="phone"
              label={"ফোন নাম্বার"}
              placeholder={"আপনার ফোন নাম্বার দিন।"}
              required={true}
              type={"string"}
            />

            <DefaultInput
              colSpan={"cols-span-1"}
              name={"password"}
              label={"পাসওয়ার্ডঃ"}
              placeholder={"আপনার পাসওয়ার্ড দিন।"}
              required={true}
              type={"password"}
            />
            <DefaultInput
              colSpan={"cols-span-1"}
              name={"cPassword"}
              label={"পুনরায় পাসওয়ার্ডঃ"}
              placeholder={"আপনার পাসওয়ার্ড পুনরায় দিন।"}
              required={true}
              type={"password"}
            />

            <Button className={"w-full mt-2 py-2"}> রেজিষ্টার করুন</Button>
          </form>
          <div className="text-[14px] mt-2 flex flex-row justify-between">
            <p className="text-slate-200"> একাউন্ট আছে?</p>
            <Link
              className="text-blue-600 hover:underline decoration-blue-500 hover:border-blue-500"
              href={"/login"}
            >
              লগইন করুন
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
