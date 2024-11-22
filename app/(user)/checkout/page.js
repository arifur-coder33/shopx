import CheckOutDetails from "./_components/CheckOutDetails";

export default async function CheckOutPage(props) {
  const { p, from } = await props.searchParams;

  return (
    <div className="pt-4">
      <CheckOutDetails from={from} />
    </div>
  );
}
