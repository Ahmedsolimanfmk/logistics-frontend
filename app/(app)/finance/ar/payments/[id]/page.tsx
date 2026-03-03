import PaymentDetailsClientPage from "./PaymentDetailsClientPage";

export default function Page({ params }: { params: { id: string } }) {
  return <PaymentDetailsClientPage id={params.id} />;
}