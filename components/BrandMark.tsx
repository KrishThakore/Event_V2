import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  compact?: boolean;
  stacked?: boolean;
  inverse?: boolean;
  subtitle?: string;
}

export default function BrandMark({
  className,
  compact = false,
  stacked = false,
  inverse = false,
  subtitle = "Electric experiences for every campus and community",
}: BrandMarkProps) {
  const titleColor = inverse ? "text-white" : "text-slate-950";
  const subtitleColor = inverse ? "text-sky-100/80" : "text-slate-500";
  const wrapper = stacked ? "flex-col items-start gap-2" : "items-center gap-3";

  return (
    <div className={cn("inline-flex", wrapper, className)}>
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_30%,#dbeafe,transparent_45%),linear-gradient(135deg,#082f49,#0f172a_52%,#1d4ed8)] shadow-[0_16px_40px_rgba(8,47,73,0.22)]">
        <div className="absolute h-4 w-4 rounded-full border-2 border-sky-300/90" />
        <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white" />
        <div className="h-5 w-[2px] rotate-12 rounded-full bg-white" />
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "font-black tracking-tight leading-none",
            compact ? "text-lg" : "text-2xl",
            titleColor
          )}
        >
          Joules<span className="text-blue-700">Events</span>
        </div>
        <div className={cn("mt-1 text-[10px] font-bold uppercase tracking-[0.24em]", subtitleColor)}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}
