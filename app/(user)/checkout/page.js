import { DefaultInput } from "@/components/defaultInput";
import { Truck } from "lucide-react";


export default async function CheckOutPage(props) {
  const { p } = await props.searchParams;
  return (
    <div className="pt-4">
      <div className="flex md:flex-nowrap flex-wrap-reverse  ">
        <div className="w-full md:w-1/2">Product Details</div>
        <div className="w-full md:w-1/2">
          <form className="max-w-md mx-auto">
          

       <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-4 bg-slate-300 p-2" ><Truck/> <span>ডেলিভারি ঠিকানাঃ</span></div>
           <DefaultInput title={'আপনার নামঃ'} name={'name'} inputType={'text'}/>
           
           <DefaultInput title={'আপনার ফোন নাম্বারঃ'} name={'number'} inputType={'text'} inputMode={'numeric'} pattern={'[0-9]*'}/>
           <DefaultInput title={' ঠিকানাঃ'} name={'address'} inputType={'text'}/>
           <div>
            ডেলিভারি ঠিকানা কি ঢাকা জেলার ভিতরে? 
          <div className="flex flex-row gap-2">
          <div className="bg-slate-400 hover:bg-blue-400 p-2 rounded-md ">
              <input type="radio" name="delivery-area" id="inside-dhaka"/>
              <label className="cursor-pointer focus:bg-blue-500" htmlFor="inside-dhaka"> হ্যা। ঢাকার ভিতরে।</label>
            </div>
            <div className="bg-slate-400 focus:bg-blue-400 p-2 rounded-md">
              <input type="radio" name="delivery-area" id="outside-dhaka"/>
              <label htmlFor="outside-dhaka"> না। ঢাকার বাহিরে</label>
            </div>
          </div>
           </div>

   


          </form>
        </div>
      </div>
    </div>
  );
}
