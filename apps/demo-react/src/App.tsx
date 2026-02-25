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
import { ThemeProvider } from "./components/theme-provider";
import { ExampleComponent } from "./components/example-component";
import {
  fetchLocation,
  fetchWeather,
  basicExamplePrompt,
  managedExamplePromptV1,
  managedExamplePromptV2,
  managedWithControlsExamplePrompt,
  versionOptions,
  resultOptionsV1,
  resultOptionsV2,
  getManagedSrc,
} from "@slopmachine/demo-shared";

function App() {
  const [location, setLocation] = useState("Auto");
  const [weather, setWeather] = useState("Auto");
  const [style, setStyle] = useState("Oil Painting");
  const [date] = useState(new Date().toLocaleDateString());

  const [result, setResult] = useState("Auto");
  const [version, setVersion] = useState("Auto");

  const [bgColor, setBgColor] = useState("white");
  const [textColor, setTextColor] = useState("black");
  const [slopColor, setSlopColor] = useState("pink");

  const [detectedLocation, setDetectedLocation] = useState("");
  const [coords, setCoords] = useState<{
    lat: number | null;
    lon: number | null;
  }>({ lat: null, lon: null });
  const [detectedWeather, setDetectedWeather] = useState("");
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

  const codeLocation =
    location === "Auto"
      ? `getLocation(), // ${detectedLocation}`
      : `"${effectiveLocation},"`;
  const codeWeather =
    weather === "Auto"
      ? `getWeather(getLocation()), // ${detectedWeather}`
      : `"${effectiveWeather},"`;

  const isLocationLoading =
    location === "Auto" &&
    (detectedLocation === "Detecting..." || !detectedLocation);
  const isWeatherLoading =
    weather === "Auto" &&
    (detectedWeather === "Detecting..." ||
      detectedWeather === "Waiting for location..." ||
      !detectedWeather);
  const isLoading = isLocationLoading || isWeatherLoading;

  const effectiveVersion = version === "Auto" ? "v2" : version;

  const currentResultOptions =
    effectiveVersion === "v1" ? resultOptionsV1 : resultOptionsV2;

  const managedSrc = getManagedSrc(effectiveVersion, result);

  const versionLabel =
    versionOptions.find((o) => o.value === version)?.label || version;
  const resultLabel =
    currentResultOptions.find((o) => o.value === result)?.label || result;

  const hasVersion = version !== "Auto";
  const hasResult = result !== "Auto";
  const hasProps = hasVersion || hasResult;

  let managedCode;
  if (hasProps) {
    managedCode = `<SlopImage\n  bucket="WhQq52dMlu6LIEotNUG"`;
    if (hasVersion) managedCode += `\n  version="${versionLabel}"`;
    if (hasResult) managedCode += `\n  result="${resultLabel}"`;
    managedCode += `\n/>`;
  } else {
    managedCode = `<SlopImage bucket="WhQq52dMlu6LIEotNUG" />`;
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="min-h-screen p-8 font-sans max-w-4xl mx-auto space-y-12">
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-4xl font-heading">Slop Machine React SDK Demo</h1>
          <a
            href={window.location.pathname.replace(/\/$/, "") + "/svelte/"}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Switch to Svelte Demo &rarr;
          </a>
        </div>

        <div className="space-y-2">
          <h2 className="font-subheading">Basic Example</h2>
          <p className="text-foreground/50">
            Image with prompt provided at runtime.
          </p>
          <ExampleComponent
            code={`<SlopImage
  prompt="${basicExamplePrompt}"
  variables={{
    location: ${codeLocation}
    weather: ${codeWeather}
    style: "${style}",
    date: new Date().toLocaleDateString()
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
                  prompt={basicExamplePrompt}
                  model="gemini-flash"
                  variables={{
                    location: effectiveLocation,
                    weather: effectiveWeather,
                    style,
                    date,
                  }}
                  className="w-full h-full object-cover transition-opacity duration-500 aspect-square"
                />
              )
            }
            controls={
              <>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="w-full ">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto" disabled={locationAutoDisabled}>
                        Auto
                      </SelectItem>
                      <SelectItem value="London">London</SelectItem>
                      <SelectItem value="Tokyo">Tokyo</SelectItem>
                      <SelectItem value="New York">New York</SelectItem>
                      <SelectItem value="Mars">Mars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Weather</Label>
                  <Select value={weather} onValueChange={setWeather}>
                    <SelectTrigger className="w-full ">
                      <SelectValue placeholder="Select weather" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto" disabled={weatherAutoDisabled}>
                        Auto
                      </SelectItem>
                      <SelectItem value="Rainy">Rainy</SelectItem>
                      <SelectItem value="Sunny">Sunny</SelectItem>
                      <SelectItem value="Snowing">Snowing</SelectItem>
                      <SelectItem value="Apocalyptic">Apocalyptic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="w-full ">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oil Painting">Oil Painting</SelectItem>
                      <SelectItem value="Cyberpunk">Cyberpunk</SelectItem>
                      <SelectItem value="Minimalist Vector">
                        Minimalist Vector
                      </SelectItem>
                      <SelectItem value="Claymation">Claymation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <p className="bg-background p-2 rounded-sm">{date}</p>
                </div>
              </>
            }
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-subheading">Managed Example</h2>
          <p className="text-foreground/50">
            Image based on a{" "}
            <a
              href="http://slopmachine.dev"
              className="text-primary text-underline font-bold"
              target="_blank">
              Slop Machine
            </a>{" "}
            bucket.
          </p>
          <ExampleComponent
            code={managedCode}
            output={
              // fake it for now
              <img
                src={managedSrc}
                alt={
                  version === "v1"
                    ? managedExamplePromptV1
                    : managedExamplePromptV2
                }
                className="w-full h-full object-cover transition-opacity duration-500 aspect-square"
              />
            }
            controls={
              <>
                <div className="space-y-2">
                  <Label>Bucket</Label>
                  <p className="bg-background p-2 rounded-sm">
                    fFzg3gpfI03VdjTekcQd
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Select value={version} onValueChange={setVersion}>
                    <SelectTrigger className="w-full ">
                      <SelectValue placeholder="Select version" />
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
                  <Label>Result</Label>
                  <Select value={result} onValueChange={setResult}>
                    <SelectTrigger className="w-full ">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentResultOptions[0].value}>
                        {currentResultOptions[0].label}
                      </SelectItem>
                      <SelectGroup>
                        <SelectLabel>Specific Result</SelectLabel>
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
          <h2 className="font-subheading">Managed with Controls Example</h2>
          <p className="text-foreground/50">
            Image based on a{" "}
            <a
              href="http://slopmachine.dev"
              className="text-primary text-underline font-bold"
              target="_blank">
              Slop Machine
            </a>{" "}
            bucket, with variables provided at runtime.
          </p>
          <ExampleComponent
            code={`<SlopImage
  bucket="WhQq52dMlu6LIEotNUG"
  variables={{
    textcolor: "${textColor}",
    bgcolor: "${bgColor}",
    slopcolor: "${slopColor}",
  }}
/>`}
            output={
              <SlopImage
                prompt={managedWithControlsExamplePrompt}
                variables={{
                  textcolor: textColor,
                  bgcolor: bgColor,
                  slopcolor: slopColor,
                }}
                className="w-full h-full object-cover transition-opacity duration-500 aspect-square"
              />
            }
            controls={
              <>
                <div className="space-y-2">
                  <Label>Bucket</Label>
                  <p className="bg-background p-2 rounded-sm">
                    fFzg3gpfI03VdjTekcQd
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <Select value={textColor} onValueChange={setTextColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select text color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <Select value={bgColor} onValueChange={setBgColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select background color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Slop Color</Label>
                  <Select value={slopColor} onValueChange={setSlopColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select slop color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pink">Pink</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
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
