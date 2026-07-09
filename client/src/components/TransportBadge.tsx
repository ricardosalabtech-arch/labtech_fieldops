import { Car, Bus, Smartphone, Plane } from "lucide-react";

const config = {
  carro_empresa: { label: "Carro Empresa", icon: Car, color: "bg-blue-100 text-blue-700" },
  transporte_publico: { label: "Transporte Público", icon: Bus, color: "bg-green-100 text-green-700" },
  app: { label: "Aplicativo", icon: Smartphone, color: "bg-purple-100 text-purple-700" },
  aviao: { label: "Avião", icon: Plane, color: "bg-indigo-100 text-indigo-700" },
};

export default function TransportBadge({ mode, size = "sm" }: { mode: string; size?: "sm" | "md" }) {
  const c = config[mode as keyof typeof config] || config.carro_empresa;
  const Icon = c.icon;
  const sizeClass = size === "md" ? "px-3 py-1.5 text-sm gap-2" : "px-2 py-1 text-xs gap-1.5";
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${c.color} ${sizeClass}`}>
      <Icon className={iconSize} />
      {c.label}
    </span>
  );
}
