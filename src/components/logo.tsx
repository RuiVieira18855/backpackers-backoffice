import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 96,
  xl: 160,
} as const;

/**
 * Backpackers World Adventures circular badge logo.
 * File expected at /public/logo.png (square, 1024×1024 ideal).
 */
export function Logo({ size = "sm", className }: Props) {
  const px = SIZES[size];
  return (
    <Image
      src="/logo.png"
      alt="Backpackers World Adventures"
      width={px}
      height={px}
      priority={size === "xl" || size === "lg"}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
