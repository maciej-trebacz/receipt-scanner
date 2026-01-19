import { v4 as uuid } from "uuid";

export interface TestReceipt {
  id: string;
  userId: string | null;
  storeName: string | null;
  storeAddress: string | null;
  date: Date | null;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  total: number;
  imagePath: string;
  categoryId: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestReceiptItem {
  id: string;
  receiptId: string;
  name: string;
  inferredName: string | null;
  productType: string | null;
  boundingBox: number[] | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  discount: number | null;
  sortOrder: number;
}

export function createTestReceipt(overrides: Partial<TestReceipt> = {}): TestReceipt {
  const now = new Date();
  return {
    id: uuid(),
    userId: "test-user-123",
    storeName: "Test Store",
    storeAddress: "ul. Testowa 1, 00-001 Warszawa",
    date: now,
    currency: "PLN",
    subtotal: 42.50,
    tax: 8.50,
    total: 51.00,
    imagePath: `/uploads/${uuid()}.jpg`,
    categoryId: null,
    notes: null,
    status: "completed",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTestReceiptItem(
  receiptId: string,
  overrides: Partial<TestReceiptItem> = {}
): TestReceiptItem {
  return {
    id: uuid(),
    receiptId,
    name: "Test Item",
    inferredName: null,
    productType: null,
    boundingBox: null,
    quantity: 1,
    unitPrice: 10.00,
    totalPrice: 10.00,
    discount: null,
    sortOrder: 0,
    ...overrides,
  };
}

export function createGroceryReceipt(overrides: Partial<TestReceipt> = {}): TestReceipt {
  return createTestReceipt({
    storeName: "Biedronka",
    storeAddress: "ul. Marszałkowska 123, 00-001 Warszawa",
    subtotal: 45.50,
    tax: 4.55,
    total: 50.05,
    ...overrides,
  });
}

export function createGroceryItems(receiptId: string): TestReceiptItem[] {
  return [
    createTestReceiptItem(receiptId, {
      name: "Mleko 3.2%",
      inferredName: "Milk",
      productType: "dairy",
      quantity: 2,
      unitPrice: 3.99,
      totalPrice: 7.98,
      sortOrder: 0,
    }),
    createTestReceiptItem(receiptId, {
      name: "Chleb tostowy",
      inferredName: "Toast Bread",
      productType: "bakery",
      quantity: 1,
      unitPrice: 4.50,
      totalPrice: 4.50,
      sortOrder: 1,
    }),
    createTestReceiptItem(receiptId, {
      name: "Masło extra 82%",
      inferredName: "Butter",
      productType: "dairy",
      quantity: 1,
      unitPrice: 8.99,
      totalPrice: 8.99,
      sortOrder: 2,
    }),
  ];
}

export function createPendingReceipt(overrides: Partial<TestReceipt> = {}): TestReceipt {
  return createTestReceipt({
    storeName: null,
    storeAddress: null,
    date: null,
    subtotal: null,
    tax: null,
    total: 0,
    status: "pending",
    ...overrides,
  });
}

export function createFailedReceipt(
  errorMessage: string,
  overrides: Partial<TestReceipt> = {}
): TestReceipt {
  return createTestReceipt({
    storeName: null,
    storeAddress: null,
    date: null,
    subtotal: null,
    tax: null,
    total: 0,
    status: "failed",
    notes: errorMessage,
    ...overrides,
  });
}
