// NO "use client". This is a Server Component.
import EMISection from "./EMI/EMISection";
import ProductClientShell from "./ProductClientShell";

export default function ProductHeader({ data, children }) {
  const { title } = data;

  // The Server Component passes both the data and the server-rendered
  // components (as props) to the Client Component.
  const sslActive = process.env.SSLCZ_STORE_ID;
  return (
    <>
      <ProductClientShell
        data={data}
        imageComponent={children} // The <Image> from page.js is passed here
        titleComponent={
          // The static h1 is created here on the server
          <h1 key={title} className="text-4xl font-bold border-b-2">
            {title}
          </h1>
        }
        bottomComponent={sslActive && <EMISection key={sslActive} />}
      />
    </>
  );
}
