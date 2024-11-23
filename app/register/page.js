import Button from "@/components/button";
import DefaultInput from "@/components/input/DefaultInput";
import KalapanaFont from "@/components/KalapanaFont";
import { LogInIcon, UserRound } from "lucide-react";


export default function RegisterPage(){
    return (
        <div className="w-full mx-auto bg-slate-700 ">
            <div className="w-100vh/90 md:max-w-xs mx-auto flex items-center justify-center h-screen">
                    <div className="w-full bg-slate-900 p-8 rounded-2xl shadow-xl shadow-purple-500">
                        <form>
                            <div className="flex flex-row gap-2 items-center justify-center text-4xl  text-purple-500 font-bold border-b-4 border-b-purple-500">
                            <UserRound/>
                                <h1 className="  "><KalapanaFont >রেজিষ্টার</KalapanaFont></h1>
                            </div>
                            
                    <div className="grid grid-cols-12  gap-2"></div>
                    <DefaultInput colSpan={'cols-span-1'} name={'name'} label={'আপনার নাম'} placeholder={'আপনার নাম দিন।'}  required={true}  type={'email'}/>

                            <DefaultInput colSpan={'cols-span-1'} name={'email'} label={'ইমেইলঃ'} placeholder={'আপনার ইমেইল দিন।'}  required={true}  type={'email'}/>
                            <DefaultInput colSpan={'cols-span-1'} name="number" label={'ফোন নাম্বার'} placeholder={'আপনার ফোন নাম্বার দিন।'}  required={true}  type={'email'}/>

                            <DefaultInput colSpan={'cols-span-1'} name={'password'} label={"পাসওয়ার্ডঃ"} placeholder={'আপনার পাসওয়ার্ড দিন।'}  required={true} type={'password'}/>
                            <DefaultInput colSpan={'cols-span-1'} name={'cPassword'} label={"পুনরায় পাসওয়ার্ডঃ"} placeholder={'আপনার পাসওয়ার্ড পুনরায় দিন।'}  required={true} type={'password'}/>

                        <Button className={'w-full mt-2 py-2'}> রেজিষ্টার করুন</Button>
                        </form>
                        <div>

                        </div>

                    </div>

                 
            </div>

        </div>
    )
}