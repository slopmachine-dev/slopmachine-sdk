import {
  v1r1src,
  v1r2src,
  v2r1src,
  v2r2src,
  v2r3src,
  v2r4src,
  v2r5src,
} from "./constants";

export const getWmoDescription = (code: number) => {
  if (code === 0) return "Clear sky";
  if (code === 1 || code === 2 || code === 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rainy";
  if (code >= 71 && code <= 77) return "Snowing";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
};

export const getManagedSrc = (effectiveVersion: string, result: string) => {
  if (effectiveVersion === "v1") {
    if (result === "r1") return v1r1src;
    return v1r2src; // Auto, r2, or fallback
  }
  // v2
  if (result === "r1") return v2r1src;
  if (result === "r2") return v2r2src;
  if (result === "r3") return v2r3src;
  if (result === "r4") return v2r4src;
  if (result === "r5") return v2r5src;
  return v2r5src; // Auto or fallback
};
