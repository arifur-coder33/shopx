import { replaceNumbers } from "@/utils/engToBanNumber"

export default async function OrderTrackingPage({params}){

    const orderNumber=await params?.orderId
   return (
    <div>
        <h1>ধন্যবাদ। আমরা আপনার অর্ডারটি পেয়েছি।
        </h1>
        <h1>আপনার অর্ডার নাম্বারঃ {orderNumber}</h1>
        <p>খুব দ্রুত আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবে।</p>

        
    </div>
   ) 
}