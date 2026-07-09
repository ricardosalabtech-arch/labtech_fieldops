import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets, Thermometer, Loader2 } from "lucide-react";

interface WeatherWidgetProps {
  city: string;
  date?: Date;
  compact?: boolean;
}

interface WeatherData {
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

const iconMap: Record<string, typeof Sun> = {
  "01d": Sun, "01n": Sun,
  "02d": Cloud, "02n": Cloud,
  "03d": Cloud, "03n": Cloud,
  "04d": Cloud, "04n": Cloud,
  "09d": CloudRain, "09n": CloudRain,
  "10d": CloudRain, "10n": CloudRain,
  "11d": CloudRain, "11n": CloudRain,
  "13d": CloudSnow, "13n": CloudSnow,
  "50d": Wind, "50n": Wind,
};

export default function WeatherWidget({ city, date, compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!city) { setLoading(false); return; }
    setLoading(true);
    setError(false);

    // Use Open-Meteo free API (no key required)
    const fetchWeather = async () => {
      try {
        // Geocode the city name
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`
        );
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          setError(true);
          setLoading(false);
          return;
        }

        const { latitude, longitude } = geoData.results[0];

        // Fetch weather forecast
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`
        );
        const weatherData = await weatherRes.json();

        const codeMap: Record<number, { condition: string; icon: string }> = {
          0: { condition: "Céu limpo", icon: "01d" },
          1: { condition: "Predominantemente limpo", icon: "02d" },
          2: { condition: "Parcialmente nublado", icon: "03d" },
          3: { condition: "Nublado", icon: "04d" },
          45: { condition: "Névoa", icon: "50d" },
          48: { condition: "Névoa gelada", icon: "50d" },
          51: { condition: "Garoa leve", icon: "09d" },
          53: { condition: "Garoa", icon: "09d" },
          55: { condition: "Garoa intensa", icon: "09d" },
          61: { condition: "Chuva leve", icon: "10d" },
          63: { condition: "Chuva", icon: "10d" },
          65: { condition: "Chuva forte", icon: "10d" },
          71: { condition: "Neve leve", icon: "13d" },
          73: { condition: "Neve", icon: "13d" },
          75: { condition: "Neve forte", icon: "13d" },
          80: { condition: "Pancos de chuva", icon: "09d" },
          81: { condition: "Pancos de chuva", icon: "09d" },
          82: { condition: "Pancos violentos", icon: "09d" },
          95: { condition: "Tempestade", icon: "11d" },
          96: { condition: "Tempestade com granizo", icon: "11d" },
          99: { condition: "Tempestade severa", icon: "11d" },
        };

        const currentCode = weatherData.current?.weather_code ?? 0;
        const mapped = codeMap[currentCode] || { condition: "—", icon: "03d" };

        // If a specific date is provided, find the matching day in the forecast
        let temp = weatherData.current?.temperature_2m ?? 0;
        let tempMin = weatherData.daily?.temperature_2m_min?.[0] ?? temp;
        let tempMax = weatherData.daily?.temperature_2m_max?.[0] ?? temp;
        let condition = mapped.condition;
        let icon = mapped.icon;

        if (date && weatherData.daily?.time) {
          const targetDateStr = date.toISOString().split("T")[0];
          const dayIndex = weatherData.daily.time.findIndex((t: string) => t === targetDateStr);
          if (dayIndex >= 0) {
            temp = Math.round((weatherData.daily.temperature_2m_max[dayIndex] + weatherData.daily.temperature_2m_min[dayIndex]) / 2);
            tempMin = weatherData.daily.temperature_2m_min[dayIndex];
            tempMax = weatherData.daily.temperature_2m_max[dayIndex];
            const dayCode = weatherData.daily.weather_code?.[dayIndex] ?? 0;
            const dayMapped = codeMap[dayCode] || { condition: "—", icon: "03d" };
            condition = dayMapped.condition;
            icon = dayMapped.icon;
          }
        }

        setWeather({
          temp: Math.round(temp),
          tempMin: Math.round(tempMin),
          tempMax: Math.round(tempMax),
          condition,
          icon,
          humidity: weatherData.current?.relative_humidity_2m ?? 0,
          windSpeed: Math.round(weatherData.current?.wind_speed_10m ?? 0),
        });
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city, date?.toDateString()]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Carregando clima...
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
        <Cloud className="h-3.5 w-3.5" />
        Clima indisponível
      </div>
    );
  }

  const Icon = iconMap[weather.icon] || Cloud;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-blue-50/60 rounded-md px-2 py-1">
        <Icon className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-blue-700">{weather.temp}°C</span>
        <span className="text-muted-foreground/70">em {city}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-blue-500" />
          <div>
            <p className="text-sm font-semibold text-blue-900">{weather.condition}</p>
            <p className="text-xs text-blue-600/70">{city}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-900">{weather.temp}°C</p>
          <p className="text-xs text-blue-600/70">{weather.tempMin}° / {weather.tempMax}°</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-blue-700/80">
        <span className="inline-flex items-center gap-1"><Droplets className="h-3 w-3" /> {weather.humidity}%</span>
        <span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" /> {weather.windSpeed} km/h</span>
      </div>
    </div>
  );
}
