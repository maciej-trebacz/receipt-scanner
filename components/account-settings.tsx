"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AccountSettings() {
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch("/api/user", { method: "DELETE" });
      await signOut();
      router.push("/");
    } catch (error) {
      toast.error("Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Account Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">Password & Security</div>
            <div className="text-sm text-muted-foreground">
              Manage your password and security settings
            </div>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => openUserProfile()}>
            Manage
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">Sign Out</div>
            <div className="text-sm text-muted-foreground">
              Sign out of your account
            </div>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div>
            <div className="font-bold text-destructive">Delete Account</div>
            <div className="text-sm text-muted-foreground">
              Permanently delete your account and all data
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-xl">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data including receipts and credits.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
