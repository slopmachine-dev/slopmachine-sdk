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

export const generateCodeLocation = (
  location: string,
  detectedLocation: string,
  effectiveLocation: string,
) => {
  return location === "Auto"
    ? `getLocation(), // ${detectedLocation}`
    : `"${effectiveLocation}",`;
};

export const generateCodeWeather = (
  weather: string,
  detectedWeather: string,
  effectiveWeather: string,
) => {
  return weather === "Auto"
    ? `getWeather(getLocation()), // ${detectedWeather}`
    : `"${effectiveWeather}",`;
};

export const generateCodeTheme = (
  theme: "Auto" | "Dark" | "Light",
  detectedTheme: string,
) => {
  return theme === "Auto"
    ? `getTheme(), // ${titleCase(detectedTheme)}`
    : `"${theme}",`;
};

export const titleCase = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const generateSimpleCode = (
  hasProps: boolean,
  hasVersion: boolean,
  hasResult: boolean,
  version: string,
  result: string,
  bucketId: string,
  promptV1: string,
  promptV2: string,
) => {
  if (hasProps) {
    let code = `<SlopImage\n  bucketId="${bucketId}" // ${
      version === "v1" ? promptV1 : promptV2
    }`;
    if (hasVersion) code += `\n  version="${version}"`;
    if (hasResult) code += `\n  resultId="${result}"`;
    code += `\n/>`;
    return code;
  } else {
    return `<SlopImage\n  bucketId="${bucketId}" // ${promptV2} \n/>`;
  }
};

// export const getManagedSrc = (effectiveVersion: string, result: string) => {
//   if (effectiveVersion === "v1") {
//     if (result === "r1") return v1r1src;
//     return v1r2src; // Auto, r2, or fallback
//   }
//   // v2
//   if (result === "r1") return v2r1src;
//   if (result === "r2") return v2r2src;
//   if (result === "r3") return v2r3src;
//   if (result === "r4") return v2r4src;
//   if (result === "r5") return v2r5src;
//   return v2r5src; // Auto or fallback
// };
