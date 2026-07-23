import { useState, useMemo, useCallback } from "react";
import { Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, isSameDay, isSameMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

export type PeriodValue = "all" | "today" | "week" | "month" | "custom";

export interface PeriodFilterProps {
  value: PeriodValue;
  onChange: (value: PeriodValue, range?: { start: Date; end: Date }) => void;
  className?: string;
}

const periodOptions: { label: string; value: PeriodValue }[] = [
  { label: "Todos os períodos", value: "all" },
  { label: "Hoje", value: "today" },
  { label: "Esta semana", value: "week" },
  { label: "Este mês", value: "month" },
  { label: "Personalizado", value: "custom" },
];

export function getPeriodRange(value: PeriodValue, customRange?: { start: Date; end: Date }): { start: Date; end: Date } | null {
  const now = new Date();
  switch (value) {
    case "today":
      return { start: now, end: now };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    case "custom":
      return customRange ?? null;
    default:
      return null;
  }
}

export function filterByPeriod<T>(items: T[], value: PeriodValue, getDate: (item: T) => Date, customRange?: { start: Date; end: Date }): T[] {
  if (value === "all") return items;
  const range = getPeriodRange(value, customRange);
  if (!range) return items;
  return items.filter(item => {
    const d = getDate(item);
    if (value === "today") return isSameDay(d, range.start);
    if (value === "week") return isWithinInterval(d, { start: range.start, end: range.end });
    if (value === "month") return isSameMonth(d, range.start);
    if (value === "custom") return d >= range.start && d <= range.end;
    return true;
  });
}

export default function PeriodFilter({ value, onChange, className = "" }: PeriodFilterProps) {
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSelect = useCallback((v: PeriodValue) => {
    if (v === "custom") {
      setPopoverOpen(true);
    } else {
      onChange(v);
    }
  }, [onChange]);

  const applyCustom = useCallback(() => {
    if (customStart && customEnd) {
      onChange("custom", { start: customStart, end: customEnd });
      setPopoverOpen(false);
    }
  }, [customStart, customEnd, onChange]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {periodOptions.map(opt => {
        const isActive = value === opt.value;
        if (opt.value === "custom") {
          return (
            <Popover key={opt.value} open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => handleSelect("custom")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[oklch(0.48_0.18_250)] text-white shadow-sm"
                      : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Data inicial</p>
                    <CalendarPicker
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      locale={ptBR}
                      className="rounded-lg border"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Data final</p>
                    <CalendarPicker
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      locale={ptBR}
                      className="rounded-lg border"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={applyCustom}
                    disabled={!customStart || !customEnd}
                    className="w-full rounded-lg"
                  >
                    Aplicar filtro
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        }
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? "bg-[oklch(0.48_0.18_250)] text-white shadow-sm"
                : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
