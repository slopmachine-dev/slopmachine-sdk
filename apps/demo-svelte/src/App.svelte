<script lang="ts">
  import { SlopImage } from "@slopmachine/svelte";
  import * as Select from "$lib/components/ui/select";
  import { Label } from "$lib/components/ui/label";
  import ExampleComponent from "./lib/components/ExampleComponent.svelte";
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
    DEFAULT_STATE,
    DROPDOWN_OPTIONS,
    generateCodeLocation,
    generateCodeWeather,
    generateSimpleCode,
    proceduralExampleBucketId,
    proceduralExamplePrompt,
    generateCodeTheme,
    titleCase,
  } from "@slopmachine/demo-shared";

  import { mode, ModeWatcher } from "mode-watcher";

  let theme = $state<"Auto" | "Light" | "Dark">("Auto");

  let location = $state(DEFAULT_STATE.location);
  let weather = $state(DEFAULT_STATE.weather);

  let result = $state(DEFAULT_STATE.result);
  let version = $state(DEFAULT_STATE.version);

  let bgColor = $state(DEFAULT_STATE.bgColor);
  let textColor = $state(DEFAULT_STATE.textColor);
  let slopColor = $state(DEFAULT_STATE.slopColor);

  let detectedLocation = $state("");
  let detectedWeather = $state("");
  let coords = $state<{ lat: number | null; lon: number | null }>({
    lat: null,
    lon: null,
  });
  let locationAutoDisabled = $state(false);
  let weatherAutoDisabled = $state(false);

  $effect(() => {
    if (location === "Auto") {
      detectedLocation = "Detecting...";
      fetchLocation()
        .then((data) => {
          detectedLocation = data.locName;
          if (data.lat && data.lon) {
            coords = {
              lat: data.lat,
              lon: data.lon,
            };
          }
        })
        .catch(() => {
          detectedLocation = "Unknown Location";
          location = "London";
          locationAutoDisabled = true;
        });
    }
  });

  let effectiveLocation = $derived(
    location === "Auto" ? detectedLocation : location,
  );

  $effect(() => {
    if (weather === "Auto") {
      if (
        effectiveLocation === "Detecting..." ||
        !effectiveLocation ||
        coords.lat === null ||
        coords.lon === null
      ) {
        detectedWeather = "Waiting for location...";
        return;
      }
      detectedWeather = "Detecting...";
      fetchWeather(coords.lat, coords.lon)
        .then((weatherDesc) => {
          detectedWeather = weatherDesc;
        })
        .catch(() => {
          detectedWeather = "Unknown Weather";
          weather = "Rainy";
          weatherAutoDisabled = true;
        });
    }
  });

  let effectiveWeather = $derived(
    weather === "Auto" ? detectedWeather : weather,
  );

  let effectiveTheme = $derived(
    theme === "Auto" ? titleCase(mode.current ?? "Light") : theme,
  );

  let codeLocation = $derived(
    generateCodeLocation(location, detectedLocation, effectiveLocation),
  );
  let codeWeather = $derived(
    generateCodeWeather(weather, detectedWeather, effectiveWeather),
  );
  let codeTheme = $derived(generateCodeTheme(theme, mode.current ?? "light"));

  let isLocationLoading = $derived(
    location === "Auto" &&
      (detectedLocation === "Detecting..." || !detectedLocation),
  );
  let isWeatherLoading = $derived(
    weather === "Auto" &&
      (detectedWeather === "Detecting..." ||
        detectedWeather === "Waiting for location..." ||
        !detectedWeather),
  );
  let isLoading = $derived(isLocationLoading || isWeatherLoading);

  let effectiveVersion = $derived(version === "Auto" ? "2" : version);

  let currentResultOptions = $derived(
    effectiveVersion === "1" ? resultOptionsV1 : resultOptionsV2,
  );

  let versionLabel = $derived(
    versionOptions.find((o) => o.value === version)?.label || version,
  );
  let resultLabel = $derived(
    currentResultOptions.find((o) => o.value === result)?.label || result,
  );

  let hasVersion = $derived(version !== "Auto");
  let hasResult = $derived(result !== "Auto");
  let hasProps = $derived(hasVersion || hasResult);

  let simpleCode = $derived(
    generateSimpleCode(
      hasProps,
      hasVersion,
      hasResult,
      version,
      result,
      simpleVersionedExampleBucketId,
      simpleVersionedExamplePromptV1,
      simpleVersionedExamplePromptV2,
    ),
  );
</script>

<ModeWatcher />
<div class="min-h-screen p-8 font-sans max-w-4xl mx-auto space-y-12">
  <div class="flex justify-between items-center border-b pb-4">
    <h1 class="text-4xl font-heading">Slop Machine Svelte SDK Demo</h1>
    <a
      href={window.location.pathname.replace(
        /\/demo-svelte\/?$/,
        "/demo-react/",
      )}
      class="text-sm text-primary"
    >
      Switch to React Demo &rarr;
    </a>
  </div>

  <div class="space-y-2">
    <h2 class="font-subheading">Simple Example</h2>
    <p class="text-foreground/50">
      Grab the latest approved image from a
      <a
        href="http://slopmachine.dev"
        class="text-primary text-underline font-bold"
        target="_blank"
      >
        Slop Machine
      </a>
      bucket.
    </p>
    <ExampleComponent code={simpleCode}>
      {#snippet output()}
        <SlopImage
          bucketId={simpleVersionedExampleBucketId}
          version={effectiveVersion === "1" ? 1 : 2}
          resultId={result === "Auto" ? undefined : result}
        />
      {/snippet}
      {#snippet controls()}
        <div class="space-y-2">
          <Label>Bucket</Label>
          <p class="bg-background p-2 rounded-sm">
            {simpleVersionedExampleBucketId}
          </p>
        </div>
        <div class="space-y-2">
          <Label>Version</Label>
          <Select.Root type="single" bind:value={version}>
            <Select.Trigger class="w-full">
              {versionLabel}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={versionOptions[0].value}
                >{versionOptions[0].label}</Select.Item
              >
              <Select.Group>
                <Select.GroupHeading>Specific Version</Select.GroupHeading>
                {#each versionOptions.slice(1) as option}
                  <Select.Item value={option.value}>{option.label}</Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
        <div class="space-y-2">
          <Label>Image</Label>
          <Select.Root type="single" bind:value={result}>
            <Select.Trigger class="w-full">
              {resultLabel}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={currentResultOptions[0].value}
                >{currentResultOptions[0].label}</Select.Item
              >
              <Select.Group>
                <Select.GroupHeading>Specific Image ID</Select.GroupHeading>
                {#each currentResultOptions.slice(1) as option}
                  <Select.Item value={option.value}>{option.label}</Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      {/snippet}
    </ExampleComponent>
  </div>

  <div class="space-y-2">
    <h2 class="font-subheading">Controlled Example</h2>
    <p class="text-foreground/50">
      Generate an image based on a
      <a
        href="http://slopmachine.dev"
        class="text-primary text-underline font-bold"
        target="_blank"
      >
        Slop Machine
      </a>
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
    >
      {#snippet output()}
        <SlopImage
          bucketId={managedExampleBucketId}
          variables={{
            textcolor: textColor,
            bgcolor: bgColor,
            slopcolor: slopColor,
          }}
          model="gemini-pro"
          class="w-full h-full object-cover transition-opacity duration-500 aspect-square"
        />
      {/snippet}
      {#snippet controls()}
        <div class="space-y-2">
          <Label>Bucket</Label>
          <p class="bg-background p-2 rounded-sm">{managedExampleBucketId}</p>
        </div>

        <div class="space-y-2">
          <Label>Text Color</Label>
          <Select.Root type="single" bind:value={textColor}>
            <Select.Trigger class="w-full">
              {textColor.charAt(0).toUpperCase() + textColor.slice(1)}
            </Select.Trigger>
            <Select.Content>
              {#each DROPDOWN_OPTIONS.textColors as opt}
                <Select.Item value={opt.value}>{opt.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label>Background Color</Label>
          <Select.Root type="single" bind:value={bgColor}>
            <Select.Trigger class="w-full">
              {bgColor.charAt(0).toUpperCase() + bgColor.slice(1)}
            </Select.Trigger>
            <Select.Content>
              {#each DROPDOWN_OPTIONS.bgColors as opt}
                <Select.Item value={opt.value}>{opt.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label>Slop Color</Label>
          <Select.Root type="single" bind:value={slopColor}>
            <Select.Trigger class="w-full">
              {slopColor.charAt(0).toUpperCase() + slopColor.slice(1)}
            </Select.Trigger>
            <Select.Content>
              {#each DROPDOWN_OPTIONS.slopColors as opt}
                <Select.Item value={opt.value}>{opt.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      {/snippet}
    </ExampleComponent>
  </div>

  <div class="space-y-2">
    <h2 class="font-subheading">Procedural Example</h2>
    <p class="text-foreground/50">
      Generate an image based on a
      <a
        href="http://slopmachine.dev"
        class="text-primary text-underline font-bold"
        target="_blank"
      >
        Slop Machine
      </a>
      bucket, based on the current date and personalized to the user's location and
      weather.
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
    >
      {#snippet output()}
        {#if isLoading}
          <div
            class="w-full h-full flex items-center justify-center bg-muted aspect-square"
          >
            <p class="text-muted-foreground animate-pulse">
              Generating parameters...
            </p>
          </div>
        {:else}
          <SlopImage
            bucketId={proceduralExampleBucketId}
            model="gemini-flash"
            variables={{
              location: effectiveLocation,
              weather: effectiveWeather,
              theme: effectiveTheme,
            }}
            class="w-full h-full object-cover transition-opacity duration-500 aspect-square"
          />
        {/if}
      {/snippet}

      {#snippet controls()}
        <div class="space-y-2">
          <Label>Bucket</Label>
          <p class="bg-background p-2 rounded-sm">
            {proceduralExampleBucketId}
          </p>
        </div>

        <div class="space-y-2">
          <Label>Location</Label>
          <Select.Root type="single" bind:value={location}>
            <Select.Trigger class="w-full">
              {location}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="Auto" disabled={locationAutoDisabled}
                >Auto</Select.Item
              >
              {#each DROPDOWN_OPTIONS.locations as opt}
                <Select.Item value={opt.value}>{opt.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label>Weather</Label>
          <Select.Root type="single" bind:value={weather}>
            <Select.Trigger class="w-full">
              {weather}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="Auto" disabled={weatherAutoDisabled}
                >Auto</Select.Item
              >
              {#each DROPDOWN_OPTIONS.weather as opt}
                <Select.Item value={opt.value}>{opt.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label>Theme</Label>
          <Select.Root type="single" bind:value={theme}>
            <Select.Trigger class="w-full">
              {theme}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="Auto">Auto</Select.Item>
              <Select.Item value="Light">Light</Select.Item>
              <Select.Item value="Dark">Dark</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      {/snippet}
    </ExampleComponent>
  </div>
</div>
