import { requireAuth } from "@/lib/auth";
import { updateUserPreferences } from "@/lib/db/queries";
import { SUPPORTED_CURRENCIES } from "@/lib/validations";

export async function PATCH(req: Request) {
  try {
    const userId = await requireAuth();
    const { preferredCurrency } = await req.json();

    if (
      preferredCurrency &&
      !SUPPORTED_CURRENCIES.includes(preferredCurrency)
    ) {
      return Response.json({ error: "Invalid currency" }, { status: 400 });
    }

    await updateUserPreferences(userId, { preferredCurrency });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
