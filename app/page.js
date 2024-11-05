import ProductCard from "@/components/ProductCard";
import HeroSection from "./(home)/_components/HeroSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <div className="flex flex-row justify-center gap-2">
        <ProductCard />
        <ProductCard />
      </div>
    </>
  );
}
