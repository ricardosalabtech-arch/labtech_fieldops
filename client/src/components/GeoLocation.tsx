import { useState, useCallback } from "react";
import { MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeoLocationProps {
  onLocationCapture?: (lat: number, lng: number) => void;
  label?: string;
}

export default function GeoLocation({ onLocationCapture, label = "Registrar Localização" }: GeoLocationProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string>("");

  const captureLocation = useCallback(() => {
    setStatus("loading");
    setError("");

    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocalização não suportada neste dispositivo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setStatus("success");
        onLocationCapture?.(latitude, longitude);
      },
      (err) => {
        setStatus("error");
        setError(err.message || "Não foi possível obter a localização.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onLocationCapture]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={captureLocation}
        disabled={status === "loading"}
        className="gap-2 w-fit"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : status === "error" ? (
          <AlertCircle className="h-4 w-4 text-red-600" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        {label}
      </Button>

      {status === "success" && coords && (
        <p className="text-xs text-muted-foreground">
          Localização registrada: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
        </p>
      )}

      {status === "error" && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
