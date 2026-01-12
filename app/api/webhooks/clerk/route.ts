import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createUser, deleteUser } from "@/lib/db/queries";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.warn("CLERK_WEBHOOK_SECRET not configured - webhook verification disabled");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  if (WEBHOOK_SECRET && svix_id && svix_timestamp && svix_signature) {
    const wh = new Webhook(WEBHOOK_SECRET);
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    evt = payload as WebhookEvent;
  }

  if (evt.type === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(" ") || null;

    try {
      await createUser({ id, email: email!, name });
    } catch (err) {
      console.error("Failed to create user:", err);
      return new Response("Failed to create user", { status: 500 });
    }
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      try {
        await deleteUser(id);
      } catch (err) {
        console.error("Failed to delete user:", err);
        return new Response("Failed to delete user", { status: 500 });
      }
    }
  }

  return new Response("OK", { status: 200 });
}
