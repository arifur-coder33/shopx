import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
import Imagecustom from "@/components/images/ImageCustom";
import { replaceNumbers } from "@/utils/engToBanNumber"
import { Heart } from "lucide-react";

export default async function OrderTrackingPage({params,searchParams}){

    const {orderNo}=await params
    const {p} =await searchParams
    const {success,data,error}=await getOrderByOrderNo(orderNo,p) 
    if ((!success && error) || !data) {
        return <p>কোন ডাটা পাওয়া যায়নি।</p>
    }

   return (
    <div>
        <h1 className="bg-green-300 p-2 rounded-md dark:text-slate-800 flex flex-row"><Heart/> ধন্যবাদ। <Heart/>   আমরা আপনার অর্ডারটি পেয়েছি। খুব দ্রুত আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।
        </h1>
     

        <div className="grid sm:grid-cols-2 px-4 border mt-2 rounded-2xl">
            <div className="sm:col-span-full text-center border-b-2 py-4 font-bold text-xl">চালান নংঃ {replaceNumbers(orderNo.toString())}</div>
            <div className="">
                    <div className="text-xl my-4 font-bold">
                        ডেলিভারি ঠিকানা
                    </div>
                    <div>
                        <p>নামঃ {data?.customerName} </p>
                        <p>মোবাইল নংঃ {data?.phoneNumber}</p>
                        <p>  ঠিকানাঃ {data?.deliveryAddress}</p>
                    </div>
            </div>

            <div className="relative overflow-x-hidden  sm:col-span-full mt-8">
        <table className="w-full text-sm text-left rtl:text-right  dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
             নংঃ
              </th>
           
              <th scope="col" className="px-6 py-3">
                ফটোঃ
              </th>
              <th scope="col" className="px-6 py-3">
                পণ্য
              </th>

              <th scope="col" className="hidden sm:table-cell px-6 py-3">
  মুল্য
</th>
<th scope="col" className="hidden sm:table-cell px-6 py-3">
  সংখ্যা
</th>
              <th scope="col" className="px-6 py-3">
                মোট মুল্য
              </th>

            </tr>
          </thead>
          <tbody>
            {data?.orderItems?.length > 0 &&
              data?.orderItems?.map((item) => <Item key={item?.id} data={item} />)}
       <tr className="font-bold">
  {/* For mobile devices */}
  <td colSpan="3" className="px-6 py-4 text-right col-span-3 sm:hidden">
    মোট পন্যর মুল্যঃ
  </td>
  {/* For small devices and larger */}
  <td className="px-6 py-4 text-right hidden sm:table-cell" colSpan="5">
    মোট পন্যর মুল্যঃ
  </td>
  <td className="px-6 py-4">{replaceNumbers(data?.orderPrice.toString())} </td>
</tr>


<tr className="font-bold">
  {/* For mobile devices */}
  <td colSpan="3" className="px-6 py-4 text-right col-span-3 sm:hidden">
    ডেলিভারি চার্জঃ {`(টাকা)`}
  </td>
  {/* For small devices and larger */}
  <td className="px-6 py-4 text-right hidden sm:table-cell" colSpan="5">
    ডেলিভারি মুল্যঃ {`(টাকা)`}
  </td>
  <td className="px-6 py-4">{replaceNumbers(data?.deliveryCharge.toString())} </td>
</tr>

<tr className="border-t-2 border-t-slate-500 font-bold text-lg">
  {/* For mobile devices */}
  <td colSpan="3" className="px-6 py-4 text-right col-span-3 sm:hidden ">
    মোট মুল্যঃ {`(টাকা)`}
  </td>
  {/* For small devices and larger */}
  <td className="px-6 py-4 text-right hidden sm:table-cell" colSpan="5">
  মোট মুল্যঃ {`(টাকা)`}
  </td>
  <td className="px-6 py-4">{replaceNumbers ((data?.deliveryCharge + data?.orderPrice).toString())} </td>
</tr>




        

        
          </tbody>
          
        </table>

      </div>
 

        </div>
        
        <div>
   
        </div>
    </div>
   ) 
}

const Item = ({ data }) => {
    return (
      <>
        <tr className="odd:bg-white  odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
       
          <th
            scope="row"
            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            {data.orderItemNo}
          </th>
          <td className="px-6 py-4">
            <Imagecustom src={data.product.mainImage} w={50} h={50} alt={data?.title} />
          </td>
          <th
            scope="row"
            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            {data.productName} 
            <p className="sm:hidden text-[10px] dark:text-gray-400 text-gray-900">
                মুল্যঃ {replaceNumbers(data?.price.toString())} X  পরিমান {replaceNumbers(data?.quantity.toString())}
            </p>
          </th>
          <td className="px-6 py-4 hidden sm:table-cell" >{replaceNumbers(data?.price)}</td>
  
          <td className="px-6 py-4 hidden sm:table-cell">{replaceNumbers(data?.quantity)}</td>
          <td className="px-6 py-4">{replaceNumbers((data?.price * data?.quantity).toString())}</td>
      
  
        </tr>
   
      </>
    );
  };
  