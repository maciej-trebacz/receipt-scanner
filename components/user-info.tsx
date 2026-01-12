"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CurrencySelector } from "@/components/currency-selector";

interface UserInfoProps {
  name: string;
  email: string;
  createdAt: Date;
  preferredCurrency: string;
}

export function UserInfo({ name, email, createdAt, preferredCurrency }: UserInfoProps) {
  const [currency, setCurrency] = useState(preferredCurrency);

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredCurrency: newCurrency }),
      });
      if (!res.ok) throw new Error();
      toast.success("Currency preference updated");
    } catch {
      toast.error("Failed to update preference");
      setCurrency(preferredCurrency);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Account Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Name</div>
            <div className="font-bold">{name}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="font-bold">{email}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Member since</div>
            <div className="font-bold">
              {new Date(createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Preferred Currency</div>
            <CurrencySelector value={currency} onChange={handleCurrencyChange} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
