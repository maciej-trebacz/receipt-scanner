import { getServerSupabaseClient } from "./supabase";
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

  const supabase = getServerSupabaseClient();
  const now = new Date().toISOString();

  for (const cat of defaultCategories) {
    const { error } = await supabase.from("categories").upsert(
      {
        id: uuid(),
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        created_at: now,
      },
      { onConflict: "name" }
    );

    if (error) {
      console.error(`Failed to seed ${cat.name}:`, error);
    }
  }

  const { data: result } = await supabase.from("categories").select("*");
  console.log(`Seeded ${result?.length || 0} categories:`);
  result?.forEach((c) => console.log(`  - ${c.name} (${c.icon})`));
}

seed().catch(console.error);
