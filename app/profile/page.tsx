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
    <div className="min-h-screen">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 glass backdrop-blur-2xl md:hidden">
        <div className="container px-6 py-5 max-w-5xl mx-auto">
          <h1 className="text-2xl font-black tracking-tight">Profile</h1>
        </div>
      </header>

      {/* Desktop Header */}
      <div className="hidden md:block container px-6 pt-8 pb-4 max-w-5xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight">Profile</h1>
      </div>

      <main className="container px-6 py-8 md:pt-4 max-w-5xl mx-auto space-y-6">
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
      </main>
    </div>
  );
}
