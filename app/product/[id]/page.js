import { customLoader } from "@/components/images/Images-Loader";
import Image from "next/image";

export default async function ProductPage({ params: { id } }){
  
    return (
        <div className="grid grid-cols-1 md:grid-cols-2">
            <div>
                <Image
                src={"/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=90"}
                loader={customLoader}
                 className=" rounded-md "
                 placeholder="blur"
                 blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                 width={500} height={500} alt="image"/>
                 <div className="flex flex-row gap-1 ">
                        <ImageGallery/>
                        <ImageGallery/>
                        <ImageGallery/>
                        <ImageGallery/>
                 </div>
            </div>
        </div>
    )
}

export function ImageGallery(){
    return (
        <Image
        src={"/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=150&q=50"}
        loader={customLoader}
         className=" rounded-md w-36"
         placeholder="blur"
         blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
         width={150} height={150} alt="image"/>
    )
}