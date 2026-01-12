/**
 * Credit system utilities for managing user credits.
 * Credits are required to process receipts.
 */

import { getServerSupabaseClient } from "./db/supabase";
import type { CreditTransactionType } from "./db/queries";

/**
 * Get current credit balance for a user
 */
export async function getCredits(userId: string): Promise<number> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return 0; // User not found
    throw new Error(`Failed to get credits: ${error.message}`);
  }

  return data?.credits ?? 0;
}

/**
 * Check if user has enough credits
 */
export async function hasCredits(userId: string, required: number = 1): Promise<boolean> {
  const credits = await getCredits(userId);
  return credits >= required;
}

/**
 * Deduct credits for receipt processing
 */
export async function deductCredit(
  userId: string,
  amount: number,
  receiptId: string,
  description?: string
): Promise<void> {
  const supabase = getServerSupabaseClient();
  const now = new Date().toISOString();

  // First check if user has enough credits
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (userError) {
    throw new Error(`Failed to check user credits: ${userError.message}`);
  }

  if (!user || user.credits < amount) {
    throw new Error("Insufficient credits");
  }

  // Deduct credits
  const { error: updateError } = await supabase
    .from("users")
    .update({
      credits: user.credits - amount,
      updated_at: now,
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to deduct credits: ${updateError.message}`);
  }

  // Log transaction
  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    type: "usage" as CreditTransactionType,
    description: description ?? "Receipt processing",
    receipt_id: receiptId,
    created_at: now,
  });

  if (txError) {
    // Try to refund if transaction logging fails
    await supabase
      .from("users")
      .update({ credits: user.credits, updated_at: now })
      .eq("id", userId);
    throw new Error(`Failed to log transaction: ${txError.message}`);
  }
}

/**
 * Add credits to user account (purchase, refund, bonus)
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: "purchase" | "refund" | "bonus",
  stripePaymentId?: string,
  description?: string
): Promise<void> {
  const supabase = getServerSupabaseClient();
  const now = new Date().toISOString();

  // Get current credits
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (userError) {
    throw new Error(`Failed to get user: ${userError.message}`);
  }

  // Add credits
  const { error: updateError } = await supabase
    .from("users")
    .update({
      credits: (user?.credits ?? 0) + amount,
      updated_at: now,
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to add credits: ${updateError.message}`);
  }

  // Log transaction
  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount,
    type,
    description,
    stripe_payment_id: stripePaymentId || null,
    created_at: now,
  });

  if (txError) {
    console.error("Failed to log credit transaction:", txError);
    // Don't throw - credits were added, just log it
  }
}

/**
 * Refund credits (admin action)
 */
export async function refundCredit(
  userId: string,
  amount: number,
  receiptId: string,
  reason: string
): Promise<void> {
  await addCredits(userId, amount, "refund", undefined, `Refund: ${reason}`);
}
