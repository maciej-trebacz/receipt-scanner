import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY not set. Receipt scanning will fail.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface ExtractedItem {
  name: string; // raw name from receipt
  inferredName: string | null; // AI-inferred readable name
  productType: string | null; // AI-inferred product category (e.g., "bread", "milk")
  boundingBox: [number, number, number, number] | null; // [ymin, xmin, ymax, xmax] in 0-1000 scale
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  discount: number | null;
}

export interface ExtractedReceipt {
  storeName: string | null;
  storeAddress: string | null;
  date: string | null; // ISO date string
  currency: string;
  receiptBoundingBox: [number, number, number, number] | null; // [ymin, xmin, ymax, xmax] in 0-1000 scale
  items: ExtractedItem[];
  subtotal: number | null;
  tax: number | null;
  total: number;
}

const EXTRACTION_PROMPT = `
Analyze this receipt image and extract the following information in JSON format:

{
  "storeName": "string or null",
  "storeAddress": "string or null",
  "date": "ISO date string (YYYY-MM-DD) or null",
  "currency": "3-letter currency code (default PLN)",
  "receiptBoundingBox": [ymin, xmin, ymax, xmax] or null,
  "items": [
    {
      "name": "string (exact text from receipt)",
      "inferredName": "string (human-readable product name)",
      "productType": "string (product category in Polish)",
      "box_2d": [ymin, xmin, ymax, xmax] or null,
      "quantity": number (default 1),
      "unitPrice": number or null,
      "totalPrice": number,
      "discount": number or null
    }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "total": number
}

Rules:
- Extract all line items visible on the receipt
- "name" should be the EXACT text as printed on the receipt (may be abbreviated/truncated)
- "inferredName" should be your best guess at the full, readable product name in the receipt's language
  - Example: "MLK 2% 1L" → "Mleko 2% 1 litr" (Polish)
  - Example: "BAN ORG" → "Banany organiczne"
  - Example: "CHLEB PSZENNY" → "Chleb pszenny"
  - If the name is already clear, inferredName can be the same as name
- "productType" should be a simple Polish category describing what the product is:
  - Examples: "chleb", "mleko", "ser", "warzywa", "owoce", "mięso", "ryby", "napoje", "przekąski", "sprzęt", "leki", "inne"
  - Use lowercase, singular form
  - Be specific but not overly detailed (e.g., "chleb" not "chleb pszenny")
  - If you can't reasonably infer a product type, use null
- "receiptBoundingBox" should be the bounding box of the the whole receipt with a small padding, in [ymin, xmin, ymax, xmax] format (0-1000 scale)
- "box_2d" should be the bounding box of the item's text line on the receipt in [ymin, xmin, ymax, xmax] format (0-1000 scale)
  - If you can detect the location of the item text, provide the bounding box
  - If not detectable, use null
- Use the currency symbol to determine currency code (zł = PLN, $ = USD, € = EUR, etc.)
- If a field is unclear or not visible, use null
- Prices should be numbers without currency symbols
- Date should be in ISO format (YYYY-MM-DD)
- If you see Polish text or złoty symbol, use PLN
- "total" is required - estimate from items if not clearly visible

Return ONLY valid JSON, no markdown code blocks or additional text.
`;

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<ExtractedReceipt> {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text();
  return parseGeminiResponse(text);
}

export function parseGeminiResponse(text: string): ExtractedReceipt {
  // Clean up the response - remove markdown code blocks if present
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);

    // Validate and set defaults
    return {
      storeName: parsed.storeName ?? null,
      storeAddress: parsed.storeAddress ?? null,
      date: parsed.date ?? null,
      currency: parsed.currency || "PLN",
      receiptBoundingBox:
        Array.isArray(parsed.receiptBoundingBox) && parsed.receiptBoundingBox.length === 4
          ? parsed.receiptBoundingBox
          : null,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: any) => ({
            name: item.name || "Unknown item",
            inferredName: item.inferredName ?? null,
            productType: item.productType ?? null,
            boundingBox: Array.isArray(item.box_2d) && item.box_2d.length === 4 ? item.box_2d : null,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? null,
            totalPrice: item.totalPrice ?? 0,
            discount: item.discount ?? null,
          }))
        : [],
      subtotal: parsed.subtotal ?? null,
      tax: parsed.tax ?? null,
      total: parsed.total ?? 0,
    };
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${error}`);
  }
}
