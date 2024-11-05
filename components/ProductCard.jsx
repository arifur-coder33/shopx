import Image from "next/image";

export default function ProductCard(){

    return(
        <div className="product-card ">
            <Image className="rounded-md" src={`https://images.unsplash.com/flagged/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c25lYWtlcnxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60`} height={300} width={300} alt="product name"/>
            <div>
                বাটা ক্লাসিক স্নাকারস(সাদা)
            </div>
            <div className="p-2 cursor-auto">
                ৫৮৬-/ <del>৭০০</del>
            </div>
            <button className="w-full button ">
                এখনি কিনুন
            </button>
        </div>
    )
}