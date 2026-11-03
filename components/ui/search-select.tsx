"use client"

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type SearchSelectOption = {
  value: string
  label: string
  /** Teks kecil di bawah label (mis. email). Ikut dicari. */
  description?: string
}

type SearchSelectProps = {
  id?: string
  options: SearchSelectOption[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

// Dropdown yang bisa dicari: ketik untuk menyaring pilihan, lalu pilih satu.
function SearchSelect({
  id,
  options,
  value,
  onValueChange,
  placeholder = "Search...",
  emptyText = "No results found.",
  disabled,
  invalid,
  className,
}: SearchSelectProps) {
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <ComboboxPrimitive.Root
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next ? next.value : null)}
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={(option, query) => {
        const text = `${option.label} ${option.description ?? ""}`.toLowerCase()
        return text.includes(query.trim().toLowerCase())
      }}
      disabled={disabled}
    >
      <div className={cn("relative", className)}>
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
        />
        <ComboboxPrimitive.Trigger
          aria-label="Show options"
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground outline-none disabled:pointer-events-none"
        >
          <ChevronDownIcon className="size-4" />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={4} className="isolate z-50">
          <ComboboxPrimitive.Popup className="max-h-72 w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ComboboxPrimitive.Empty className="px-2 py-1.5 text-sm text-muted-foreground empty:hidden">
              {emptyText}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(option: SearchSelectOption) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  value={option}
                  className="relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{option.label}</p>
                    {option.description ? (
                      <p className="truncate text-xs text-muted-foreground">{option.description}</p>
                    ) : null}
                  </div>
                  <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { SearchSelect }
