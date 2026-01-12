import { requireAuth } from "@/lib/auth";
import { getCredits } from "@/lib/credits";

export async function GET() {
  try {
    const userId = await requireAuth();
    const credits = await getCredits(userId);

    return Response.json({ credits });
  } catch (error) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
