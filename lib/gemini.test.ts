import { describe, test, expect } from "bun:test";
import { parseGeminiResponse, type ExtractedReceipt } from "./gemini";

describe("parseGeminiResponse", () => {
  test("parses valid JSON response", () => {
    const response = `{
      "storeName": "Biedronka",
      "storeAddress": "ul. Testowa 1, Warszawa",
      "date": "2024-12-28",
      "currency": "PLN",
      "items": [
        {"name": "Mleko", "quantity": 2, "unitPrice": 3.50, "totalPrice": 7.00, "discount": null},
        {"name": "Chleb", "quantity": 1, "unitPrice": null, "totalPrice": 4.50, "discount": null}
      ],
      "subtotal": 10.50,
      "tax": 1.00,
      "total": 11.50
    }`;

    const result = parseGeminiResponse(response);

    expect(result.storeName).toBe("Biedronka");
    expect(result.storeAddress).toBe("ul. Testowa 1, Warszawa");
    expect(result.date).toBe("2024-12-28");
    expect(result.currency).toBe("PLN");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe("Mleko");
    expect(result.items[0].quantity).toBe(2);
    expect(result.total).toBe(11.50);
  });

  test("parses JSON wrapped in markdown code blocks", () => {
    const response = `\`\`\`json
{
  "storeName": "Lidl",
  "storeAddress": null,
  "date": "2024-12-27",
  "currency": "PLN",
  "items": [{"name": "Apple", "quantity": 1, "totalPrice": 2.00}],
  "subtotal": null,
  "tax": null,
  "total": 2.00
}
\`\`\``;

    const result = parseGeminiResponse(response);

    expect(result.storeName).toBe("Lidl");
    expect(result.currency).toBe("PLN");
    expect(result.items).toHaveLength(1);
  });

  test("handles missing optional fields with defaults", () => {
    const response = `{
      "storeName": null,
      "items": [],
      "total": 0
    }`;

    const result = parseGeminiResponse(response);

    expect(result.storeName).toBeNull();
    expect(result.storeAddress).toBeNull();
    expect(result.date).toBeNull();
    expect(result.currency).toBe("PLN");
    expect(result.items).toHaveLength(0);
    expect(result.subtotal).toBeNull();
    expect(result.tax).toBeNull();
    expect(result.total).toBe(0);
  });

  test("handles item with missing quantity (defaults to 1)", () => {
    const response = `{
      "storeName": "Shop",
      "items": [{"name": "Item", "totalPrice": 5.00}],
      "total": 5.00
    }`;

    const result = parseGeminiResponse(response);

    expect(result.items[0].quantity).toBe(1);
    expect(result.items[0].unitPrice).toBeNull();
    expect(result.items[0].discount).toBeNull();
  });

  test("throws on invalid JSON", () => {
    const response = "This is not JSON";

    expect(() => parseGeminiResponse(response)).toThrow(
      "Failed to parse Gemini response"
    );
  });

  test("handles complex Polish receipt", () => {
    const response = `{
      "storeName": "ŻABKA Z7542",
      "storeAddress": "ul. Marszałkowska 123, 00-001 Warszawa",
      "date": "2024-12-28",
      "currency": "PLN",
      "items": [
        {"name": "PRINCE POLO CLASSIC 35G", "quantity": 2, "unitPrice": 1.99, "totalPrice": 3.98, "discount": null},
        {"name": "COCA COLA 0.5L", "quantity": 1, "totalPrice": 4.99, "discount": 0.50},
        {"name": "HOT DOG", "quantity": 1, "totalPrice": 5.00, "discount": null}
      ],
      "subtotal": 13.47,
      "tax": 1.03,
      "total": 14.50
    }`;

    const result = parseGeminiResponse(response);

    expect(result.storeName).toBe("ŻABKA Z7542");
    expect(result.items).toHaveLength(3);
    expect(result.items[1].discount).toBe(0.50);
    expect(result.total).toBe(14.50);
  });
});
