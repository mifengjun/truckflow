"use client";

import { useState } from "react";
import { ChevronsUpDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { Address } from "./types";

export function AddressPicker({
  id,
  addresses,
  onSelect,
}: {
  id: string;
  addresses: Address[];
  onSelect: (address: Address) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          搜索并填入已保存地址
          <ChevronsUpDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput
            placeholder="名称、城市、州或邮编"
            aria-label="搜索地址簿"
          />
          <CommandList>
            <CommandEmpty>没有匹配的地址，可直接在下方填写。</CommandEmpty>
            <CommandGroup heading="已保存地址">
              {addresses.map((address) => (
                <CommandItem
                  key={address.id}
                  value={address.id}
                  keywords={[
                    address.data.name,
                    address.data.street,
                    address.data.city,
                    address.data.state,
                    address.data.postalCode,
                  ]}
                  onSelect={() => {
                    onSelect(address);
                    setOpen(false);
                  }}
                >
                  <MapPin aria-hidden />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate">{address.data.name}</span>
                    <span className="text-muted-foreground">
                      {address.data.city}, {address.data.state}{" "}
                      {address.data.postalCode}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
