import { ReceiptList } from "@/components/receipt-list";

export default function ReceiptsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container px-4 py-4">
          <h1 className="text-xl font-semibold">Receipts</h1>
        </div>
      </header>

      <main className="container px-4 py-6">
        <ReceiptList />
      </main>
    </div>
  );
}
