export interface MockGeminiReceipt {
  storeName: string | null;
  storeAddress: string | null;
  date: string | null;
  currency: string;
  items: MockGeminiItem[];
  subtotal: number | null;
  tax: number | null;
  total: number;
  receiptBoundingBox?: number[];
}

export interface MockGeminiItem {
  name: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  discount: number | null;
  inferredName?: string | null;
  productType?: string | null;
  boundingBox?: number[];
}

export function createMockGeminiResponse(
  overrides: Partial<MockGeminiReceipt> = {}
): MockGeminiReceipt {
  return {
    storeName: "Test Store",
    storeAddress: "ul. Testowa 1, 00-001 Warszawa",
    date: new Date().toISOString().split("T")[0],
    currency: "PLN",
    items: [
      {
        name: "Test Item",
        quantity: 1,
        unitPrice: 10.00,
        totalPrice: 10.00,
        discount: null,
      },
    ],
    subtotal: 10.00,
    tax: 2.30,
    total: 12.30,
    ...overrides,
  };
}

export function createGroceryGeminiResponse(): MockGeminiReceipt {
  return createMockGeminiResponse({
    storeName: "ŻABKA Z7542",
    storeAddress: "ul. Marszałkowska 123, 00-001 Warszawa",
    items: [
      {
        name: "PRINCE POLO CLASSIC 35G",
        quantity: 2,
        unitPrice: 1.99,
        totalPrice: 3.98,
        discount: null,
        inferredName: "Chocolate Bar",
        productType: "snacks",
      },
      {
        name: "COCA COLA 0.5L",
        quantity: 1,
        unitPrice: 4.99,
        totalPrice: 4.99,
        discount: 0.50,
        inferredName: "Coca-Cola",
        productType: "beverages",
      },
    ],
    subtotal: 8.47,
    tax: 0.65,
    total: 9.12,
  });
}

export function createEmptyReceiptResponse(): MockGeminiReceipt {
  return createMockGeminiResponse({
    storeName: null,
    storeAddress: null,
    date: null,
    items: [],
    subtotal: null,
    tax: null,
    total: 0,
  });
}

export function toGeminiJsonString(response: MockGeminiReceipt): string {
  return JSON.stringify(response, null, 2);
}

export function toGeminiMarkdownWrapped(response: MockGeminiReceipt): string {
  return `\`\`\`json\n${toGeminiJsonString(response)}\n\`\`\``;
}
