import { Navigation } from "lucide-react";

interface WazeLinkProps {
  address: string;
  city?: string;
  className?: string;
  label?: string;
}

export default function WazeLink({ address, city, className = "", label = "Waze" }: WazeLinkProps) {
  const fullAddress = city ? `${address}, ${city}` : address;
  const wazeUrl = `https://www.waze.com/ul?q=${encodeURIComponent(fullAddress)}&navigate=yes`;

  return (
    <a
      href={wazeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-[oklch(0.48_0.18_250)] hover:text-[oklch(0.38_0.18_250)] transition-colors ${className}`}
      title={`Abrir no Waze: ${fullAddress}`}
    >
      <Navigation className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
