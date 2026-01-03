import { db, categories } from "./index";
import { v4 as uuid } from "uuid";

const defaultCategories = [
  { name: "Groceries", icon: "ShoppingCart01Icon", color: "#22c55e" },
  { name: "Dining", icon: "Restaurant01Icon", color: "#f97316" },
  { name: "Shopping", icon: "ShoppingBag01Icon", color: "#a855f7" },
  { name: "Transport", icon: "Car01Icon", color: "#3b82f6" },
  { name: "Entertainment", icon: "Gameboy01Icon", color: "#ec4899" },
  { name: "Healthcare", icon: "FirstAidKitIcon", color: "#ef4444" },
  { name: "Utilities", icon: "Electricity01Icon", color: "#eab308" },
  { name: "Other", icon: "MoreHorizontalIcon", color: "#6b7280" },
];

async function seed() {
  console.log("Seeding categories...");

  const now = new Date();

  for (const cat of defaultCategories) {
    await db
      .insert(categories)
      .values({
        id: uuid(),
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        createdAt: now,
      })
      .onConflictDoNothing();
  }

  const result = await db.select().from(categories);
  console.log(`Seeded ${result.length} categories:`);
  result.forEach((c) => console.log(`  - ${c.name} (${c.icon})`));
}

seed().catch(console.error);
