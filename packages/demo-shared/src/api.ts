import { getWmoDescription } from "./utils";

export const fetchLocation = async () => {
  const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
  if (!res.ok) throw new Error("Failed to fetch location");
  const data = await res.json();
  return {
    locName: data.country || "Unknown Location",
    lat: data.latitude ? parseFloat(data.latitude) : null,
    lon: data.longitude ? parseFloat(data.longitude) : null,
  };
};

export const fetchWeather = async (lat: number, lon: number) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
  );
  if (!res.ok) throw new Error("Failed to fetch weather");
  const data = await res.json();
  const condition = data?.current_weather?.weathercode;
  if (condition !== undefined) {
    return getWmoDescription(condition);
  }
  return "Unknown";
};
