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

export const getBrowserLanguage = () => {
  if (typeof navigator !== "undefined" && navigator.language) {
    const lang = navigator.language.split("-")[0];
    switch (lang) {
      case "es":
        return "Spanish";
      case "fr":
        return "French";
      case "de":
        return "German";
      case "ja":
        return "Japanese";
      case "zh":
        return "Chinese";
      case "hi":
        return "Hindi";
      case "ar":
        return "Arabic";
      case "pt":
        return "Portuguese";
      case "ru":
        return "Russian";
      case "it":
        return "Italian";
      case "ko":
        return "Korean";
      default:
        return "English";
    }
  }
  return "English";
};

export const generateCodeLanguage = (
  language: string,
  detectedLanguage: string,
) => {
  if (language === "Auto") {
    return `getLanguage(), // ${detectedLanguage}`;
  }
  return `"${language}",`;
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

export const examplesContent = {
  simple: {
    heading: "Simple Example",
    descriptionPrefix: "Grab the latest approved image from a",
    descriptionSuffix: ".",
  },
  controlled: {
    heading: "Controlled Example",
    descriptionPrefix: "Update an existing image in a",
    descriptionSuffix: ", with specific changes allowed at runtime.",
  },
  procedural: {
    heading: "Procedural Example",
    descriptionPrefix: "Generate an image based on a",
    descriptionSuffix:
      ", based on the current date and personalized to the user's location and weather.",
  },
  video: {
    heading: "Video Example",
    descriptionPrefix: "Generate a video based on a",
    descriptionSuffix: ", passing variables to configure the output.",
  },
  text: {
    heading: "Text Example",
    descriptionPrefix: "Generate text based on a",
    descriptionSuffix: ", passing variables to configure the output.",
  },
};
