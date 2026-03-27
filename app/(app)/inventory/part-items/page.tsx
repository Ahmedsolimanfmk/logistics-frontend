import { partItemsService } from "@/src/services/part-items.service";

export default async function PartItemsPage() {
  const items = await partItemsService.list();

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Part Items</h1>

      {items.length === 0 ? (
        <p>No items found</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="border p-2 rounded">
              {item.name || item.parts?.name || item.internal_serial || item.id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}