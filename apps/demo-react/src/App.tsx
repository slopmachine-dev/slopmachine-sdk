import { useState, useEffect } from "react";
import { SlopImage } from "@slopmachine/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ThemeProvider, useTheme } from "./components/theme-provider";
import { ExampleComponent } from "./components/example-component";
import {
  fetchLocation,
  fetchWeather,
  managedWithControlsExamplePrompt,
  versionOptions,
  resultOptionsV1,
  resultOptionsV2,
  managedExampleBucketId,
  simpleVersionedExampleBucketId,
  simpleVersionedExamplePromptV1,
  simpleVersionedExamplePromptV2,
  proceduralExampleBucketId,
  proceduralExamplePrompt,
  DEFAULT_STATE,
  DROPDOWN_OPTIONS,
  generateCodeLocation,
  generateCodeWeather,
  generateSimpleCode,
  generateCodeTheme,
  titleCase,
} from "@slopmachine/demo-shared";

function App() {
  const { theme: siteTheme } = useTheme();
  const resolvedTheme =
    siteTheme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : siteTheme;

  const [theme, setTheme] = useState<"Auto" | "Light" | "Dark">("Auto");
  const [location, setLocation] = useState(DEFAULT_STATE.location);
  const [weather, setWeather] = useState(DEFAULT_STATE.weather);

  const [result, setResult] = useState(DEFAULT_STATE.result);
  const [version, setVersion] = useState(DEFAULT_STATE.version);

  const [bgColor, setBgColor] = useState(DEFAULT_STATE.bgColor);
  const [textColor, setTextColor] = useState(DEFAULT_STATE.textColor);
  const [slopColor, setSlopColor] = useState(DEFAULT_STATE.slopColor);

  const [detectedLocation, setDetectedLocation] = useState("");
  const [detectedWeather, setDetectedWeather] = useState("");
  const [coords, setCoords] = useState<{
    lat: number | null;
    lon: number | null;
  }>({ lat: null, lon: null });
  const [locationAutoDisabled, setLocationAutoDisabled] = useState(false);
  const [weatherAutoDisabled, setWeatherAutoDisabled] = useState(false);

  useEffect(() => {
    if (location === "Auto") {
      setDetectedLocation("Detecting...");
      fetchLocation()
        .then((data) => {
          setDetectedLocation(data.locName);
          if (data.lat && data.lon) {
            setCoords({ lat: data.lat, lon: data.lon });
          }
        })
        .catch(() => {
          setDetectedLocation("Unknown Location");
          setLocation("London");
          setLocationAutoDisabled(true);
        });
    }
  }, [location]);

  const effectiveLocation = location === "Auto" ? detectedLocation : location;

  useEffect(() => {
    if (weather === "Auto") {
      if (
        effectiveLocation === "Detecting..." ||
        !effectiveLocation ||
        coords.lat === null ||
        coords.lon === null
      ) {
        setDetectedWeather("Waiting for location...");
        return;
      }
      setDetectedWeather("Detecting...");
      fetchWeather(coords.lat, coords.lon)
        .then((weatherDesc) => {
          setDetectedWeather(weatherDesc);
        })
        .catch(() => {
          setDetectedWeather("Unknown Weather");
          setWeather("Rainy");
          setWeatherAutoDisabled(true);
        });
    }
  }, [weather, effectiveLocation, coords.lat, coords.lon]);

  const effectiveWeather = weather === "Auto" ? detectedWeather : weather;

  const effectiveTheme = theme === "Auto" ? titleCase(resolvedTheme) : theme;

  const codeLocation = generateCodeLocation(
    location,
    detectedLocation,
    effectiveLocation,
  );
  const codeWeather = generateCodeWeather(
    weather,
    detectedWeather,
    effectiveWeather,
  );
  const codeTheme = generateCodeTheme(theme, resolvedTheme);

  const isLocationLoading =
    location === "Auto" &&
    (detectedLocation === "Detecting..." || !detectedLocation);
  const isWeatherLoading =
    weather === "Auto" &&
    (detectedWeather === "Detecting..." ||
      detectedWeather === "Waiting for location..." ||
      !detectedWeather);
  const isLoading = isLocationLoading || isWeatherLoading;

  const effectiveVersion = version === "Auto" ? "2" : version;

  const currentResultOptions =
    effectiveVersion === "1" ? resultOptionsV1 : resultOptionsV2;

  const versionLabel =
    versionOptions.find((o) => o.value === version)?.label || version;
  const resultLabel =
    currentResultOptions.find((o) => o.value === result)?.label || result;

  const hasVersion = version !== "Auto";
  const hasResult = result !== "Auto";
  const hasProps = hasVersion || hasResult;

  const simpleCode = generateSimpleCode(
    hasProps,
    hasVersion,
    hasResult,
    version,
    result,
    simpleVersionedExampleBucketId,
    simpleVersionedExamplePromptV1,
    simpleVersionedExamplePromptV2,
  );

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="min-h-screen p-8 font-sans max-w-4xl mx-auto space-y-12">
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-4xl font-heading">Slop Machine React SDK Demo</h1>
          <a
            href={window.location.pathname.replace(
              /\/demo-react\/?$/,
              "/demo-svelte/",
            )}
            className="text-sm text-primary"
          >
            Switch to Svelte Demo &rarr;
          </a>
        </div>

        <div className="space-y-2">
          <h2 className="font-subheading">Simple Example</h2>
          <p className="text-foreground/50">
            Grab the latest approved image from a{" "}
            <a
              href="http://slopmachine.dev"
              className="text-primary text-underline font-bold"
              target="_blank"
            >
              Slop Machine
            </a>{" "}
            bucket.
          </p>
          <ExampleComponent
            code={simpleCode}
            output={
              <SlopImage
                bucketId={simpleVersionedExampleBucketId}
                version={effectiveVersion === "1" ? 1 : 2}
                resultId={result === "Auto" ? undefined : result}
              />
            }
            controls={
              <>
                <div className="space-y-2">
                  <Label>Bucket</Label>
                  <p className="bg-background p-2 rounded-sm">
                    {simpleVersionedExampleBucketId}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Select value={version} onValueChange={setVersion}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={versionLabel}>
                        {versionLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={versionOptions[0].value}>
                        {versionOptions[0].label}
                      </SelectItem>
                      <SelectGroup>
                        <SelectLabel>Specific Version</SelectLabel>
                        {versionOptions.slice(1).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <Select value={result} onValueChange={setResult}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={resultLabel}>
                        {resultLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentResultOptions[0].value}>
                        {currentResultOptions[0].label}
                      </SelectItem>
                      <SelectGroup>
                        <SelectLabel>Specific Image ID</SelectLabel>
                        {currentResultOptions.slice(1).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </>
            }
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-subheading">Controlled Example</h2>
          <p className="text-foreground/50">
            Generate an image based on a{" "}
            <a
              href="http://slopmachine.dev"
              className="text-primary text-underline font-bold"
              target="_blank"
            >
              Slop Machine
            </a>{" "}
            bucket, with specific changes allowed at runtime.
          </p>
          <ExampleComponent
            code={`<SlopImage
  bucket="${managedExampleBucketId}" // ${managedWithControlsExamplePrompt}
  variables={{
    textcolor: "${textColor}",
    bgcolor: "${bgColor}",
    slopcolor: "${slopColor}",
  }}
/>`}
            output={
              <SlopImage
                bucketId={managedExampleBucketId}
                variables={{
                  textcolor: textColor,
                  bgcolor: bgColor,
                  slopcolor: slopColor,
                }}
                model="gemini-pro"
                className="w-full h-full object-cover transition-opacity duration-500 aspect-square"
              />
            }
            controls={
              <>
                <div className="space-y-2">
                  <Label>Bucket</Label>
                  <p className="bg-background p-2 rounded-sm">
                    {managedExampleBucketId}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <Select value={textColor} onValueChange={setTextColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select text color">
                        {textColor.charAt(0).toUpperCase() + textColor.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DROPDOWN_OPTIONS.textColors.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <Select value={bgColor} onValueChange={setBgColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select background color">
                        {bgColor.charAt(0).toUpperCase() + bgColor.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DROPDOWN_OPTIONS.bgColors.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Slop Color</Label>
                  <Select value={slopColor} onValueChange={setSlopColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select slop color">
                        {slopColor.charAt(0).toUpperCase() + slopColor.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DROPDOWN_OPTIONS.slopColors.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            }
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-subheading">Procedural Example</h2>
          <p className="text-foreground/50">
            Generate an image based on a{" "}
            <a
              href="http://slopmachine.dev"
              className="text-primary text-underline font-bold"
              target="_blank"
            >
              Slop Machine
            </a>{" "}
            bucket, based on the current date and personalized to the user's
            location and weather.
          </p>
          <ExampleComponent
            code={`<SlopImage
  bucketId="${proceduralExampleBucketId}" // "${proceduralExamplePrompt}"
  variables={{
    location: ${codeLocation}
    weather: ${codeWeather}
    theme: ${codeTheme}
  }}
/>`}
            output={
              isLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-muted aspect-square">
                  <p className="text-muted-foreground animate-pulse">
                    Generating parameters...
                  </p>
                </div>
              ) : (
                <SlopImage
                  bucketId={proceduralExampleBucketId}
                  model="gemini-flash"
                  variables={{
                    location: effectiveLocation,
                    weather: effectiveWeather,
                    theme: effectiveTheme,
                  }}
                  className="w-full h-full object-cover transition-opacity duration-500 aspect-square"
                />
              )
            }
            controls={
              <>
                <div className="space-y-2">
                  <Label>Bucket</Label>
                  <p className="bg-background p-2 rounded-sm">
                    {proceduralExampleBucketId}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select location">
                        {location}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto" disabled={locationAutoDisabled}>
                        Auto
                      </SelectItem>
                      {DROPDOWN_OPTIONS.locations.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Weather</Label>
                  <Select value={weather} onValueChange={setWeather}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select weather">
                        {weather}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto" disabled={weatherAutoDisabled}>
                        Auto
                      </SelectItem>
                      {DROPDOWN_OPTIONS.weather.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={theme}
                    onValueChange={(val: any) => setTheme(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Theme">{theme}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Auto</SelectItem>
                      <SelectItem value="Light">Light</SelectItem>
                      <SelectItem value="Dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            }
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
