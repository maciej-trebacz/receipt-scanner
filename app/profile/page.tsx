import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUser, getUserTransactions } from "@/lib/db/queries";
import { UserInfo } from "@/components/user-info";
import { CreditSection } from "@/components/credit-section";
import { TransactionHistory } from "@/components/transaction-history";
import { AccountSettings } from "@/components/account-settings";

export default async function ProfilePage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const dbUser = await getUser(clerkUser.id);

  if (!dbUser) {
    redirect("/sign-in");
  }

  const transactions = await getUserTransactions(dbUser.id, { limit: 10 });

  return (
    <div className="container max-w-2xl px-6 py-10 space-y-6">
      <h1 className="text-4xl font-black tracking-tight">Profile</h1>

      <UserInfo
        name={clerkUser.fullName ?? clerkUser.firstName ?? "User"}
        email={clerkUser.emailAddresses[0]?.emailAddress ?? ""}
        createdAt={dbUser.createdAt}
        preferredCurrency={dbUser.preferredCurrency ?? "PLN"}
      />

      <CreditSection credits={dbUser.credits} />

      <TransactionHistory
        transactions={transactions}
        showViewAll={transactions.length >= 10}
      />

      <AccountSettings />
    </div>
  );
}
