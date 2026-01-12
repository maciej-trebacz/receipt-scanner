import { requireAuth } from "@/lib/auth";
import { deleteUser } from "@/lib/db/queries";
import { clerkClient } from "@clerk/nextjs/server";

export async function DELETE() {
  try {
    const userId = await requireAuth();

    // Delete user from our database (cascades to receipts, transactions)
    await deleteUser(userId);

    // Delete user from Clerk
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
