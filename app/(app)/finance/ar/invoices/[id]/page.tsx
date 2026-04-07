import InvoiceDetailsClientPage from "./InvoiceDetailsClientPage";

export default function Page({ params }: { params: { id: string } }) {
  return <InvoiceDetailsClientPage id={params.id} />;
}