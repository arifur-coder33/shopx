import Button from "@/components/button";
import DefaultInput from "@/components/input/DefaultInput";
import KalapanaFont from "@/components/KalapanaFont";
import { LogInIcon } from "lucide-react";


export default function LoginPage(){
    return (
        <div className="w-full mx-auto bg-slate-700 ">
            <div className="w-full md:max-w-lg mx-auto flex items-center justify-center h-screen">
                    <div className=" bg-slate-900 p-8 rounded-2xl shadow-xl shadow-purple-500">
                        <form>
                            <div className="flex flex-row gap-2 items-center justify-center text-4xl  text-purple-500 font-bold border-b-4 border-b-purple-500">
                            <LogInIcon/>
                                <h1 className="  "><KalapanaFont >লগইন</KalapanaFont></h1>
                            </div>
                            
                    <div className="grid grid-cols-12  gap-2"></div>
                            <DefaultInput colSpan={'cols-span-1'} label={'ইমেইলঃ'} placeholder={'আপনার ইমেইল দিন।'}  required={true}  type={'email'}/>
                            <DefaultInput colSpan={'cols-span-1'} label={"পাসওয়ার্ডঃ"} placeholder={'আপনার পাসওয়ার্ড দিন।'}  required={true} type={'password'}/>
                        <Button className={'w-full mt-2'}> লগইন করুন</Button>
                        </form>
                        <div>

                        </div>

                    </div>

                 
            </div>

        </div>
    )
}