import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/lib/db/queries";

export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireAuthWithUser(): Promise<string> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("No email found");
  }

  await ensureUser({
    id: user.id,
    email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
  });

  return user.id;
}
