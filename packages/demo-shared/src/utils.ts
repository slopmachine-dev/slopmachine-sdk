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
  if (location === "Auto") {
    return `getLocation(), // ${detectedLocation}`;
  }
  return `"${effectiveLocation}",`;
};

export const generateCodeWeather = (
  weather: string,
  detectedWeather: string,
  effectiveWeather: string,
) => {
  if (weather === "Auto") {
    return `getWeather(getLocation()), // ${detectedWeather}`;
  }
  return `"${effectiveWeather}",`;
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
) => {
  if (hasProps) {
    let code = `<SlopImage\n  bucketId="${bucketId}"`;
    if (hasVersion) code += `\n  version="${version}"`;
    if (hasResult) code += `\n  resultId="${result}"`;
    code += `\n/>`;
    return code;
  } else {
    return `<SlopImage bucketId="${bucketId}" />`;
  }
};
