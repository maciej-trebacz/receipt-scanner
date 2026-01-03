"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface CategoryPickerProps {
  value?: string;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-12 w-full rounded-xl bg-muted/20 animate-pulse" />
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary transition-all px-4 font-medium">
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent className="glass border-border/50 rounded-2xl">
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id} className="focus:bg-primary/10 focus:text-primary rounded-xl mx-1 my-0.5">
            <span className="flex items-center gap-2">
              <div
                className="size-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                style={{ color: cat.color || 'var(--primary)', backgroundColor: 'currentColor' }}
              />
              {cat.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
