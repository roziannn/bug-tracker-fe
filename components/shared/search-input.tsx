"use client";

import type { ComponentProps } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<ComponentProps<typeof Input>, "className"> & {
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
};

export function SearchInput({ className, inputClassName, showIcon = true, ...props }: SearchInputProps) {
  return (
    <div className={cn(
      "flex h-9 min-w-0 items-center gap-2 rounded-lg border border-input bg-background px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
      className,
    )}>
      {showIcon ? <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : null}
      <Input
        {...props}
        className={cn("h-full min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent", inputClassName)}
      />
    </div>
  );
}
