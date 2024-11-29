import Button from "@/components/button";
import FloatingInput from "@/components/input/FloatingInput";

export default function ProductAdd() {
  return (
    <div className=" p-4">
      <div>Product Add</div>
      <div className="w-full ">
        <form>
          <FloatingInput label={"Product Name"} name={"name"} type={"text"} />
          <FloatingInput
            label={"Product Catagory"}
            name={"catagory"}
            type={"text"}
          />
          <FloatingInput
            label={"Regular Price"}
            name={"regularPrice"}
            type={"text"}
          />

          <FloatingInput
            label={"Discount Price"}
            name={"discountPrice"}
            type={"text"}
          />
          <FloatingInput
            label={"Product Description"}
            name={"description"}
            type={"textArea"}
          />

          <FloatingInput label={"Photo"} name={"photo"} type={"text"} />
          <Button> Save </Button>
        </form>
      </div>
    </div>
  );
}
