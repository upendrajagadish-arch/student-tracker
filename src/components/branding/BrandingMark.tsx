import type { PublicBrandingSettings } from "@/types/branding";
import { GraduationCap } from "lucide-react";
import Image from "next/image";

interface BrandingMarkProps {
  branding: PublicBrandingSettings;
  size?: "sm" | "md" | "lg";
  showProduct?: boolean;
  variant?: "default" | "onDark";
  className?: string;
}

const SIZE_MAP = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4", title: "text-sm", sub: "text-[10px]" },
  md: { box: "h-9 w-9", icon: "h-5 w-5", title: "text-sm", sub: "text-xs" },
  lg: { box: "h-10 w-10", icon: "h-6 w-6", title: "text-xl", sub: "text-sm" },
};

export function BrandingMark({
  branding,
  size = "md",
  showProduct = true,
  variant = "default",
  className = "",
}: BrandingMarkProps) {
  const s = SIZE_MAP[size];
  const accent = branding.primaryColor ?? undefined;
  const titleClass =
    variant === "onDark" ? "text-white" : "text-slate-900";
  const subClass =
    variant === "onDark" ? "text-slate-300" : "text-slate-500";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {branding.logoUrl ? (
        <div
          className={`relative ${s.box} shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white`}
        >
          <Image
            src={branding.logoUrl}
            alt={`${branding.institutionName} logo`}
            fill
            className="object-contain p-0.5"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={`flex ${s.box} shrink-0 items-center justify-center rounded-lg text-white`}
          style={{ backgroundColor: accent ?? "#4f46e5" }}
        >
          <GraduationCap className={s.icon} />
        </div>
      )}
      <div className="min-w-0">
        <p className={`truncate font-semibold ${titleClass} ${s.title}`}>
          {branding.institutionName}
        </p>
        <p className={`truncate ${subClass} ${s.sub}`}>
          {branding.placementCellName}
          {showProduct ? ` · ${branding.productName}` : ""}
        </p>
      </div>
    </div>
  );
}
