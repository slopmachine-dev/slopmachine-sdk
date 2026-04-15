<script lang="ts">
  import { SlopImage, SlopVideo, SlopText } from "@slopmachine/svelte";
  import * as Select from "$lib/components/ui/select";
  import { Label } from "$lib/components/ui/label";
  import ExampleComponent from "./lib/components/ExampleComponent.svelte";
  import {
    fetchLocation,
    fetchWeather,
    versionOptions,
    resultOptionsV1,
    resultOptionsV2,
    managedExampleBucketId,
    simpleVersionedExampleBucketId,
    DEFAULT_STATE,
    DROPDOWN_OPTIONS,
    generateCodeLocation,
    generateCodeWeather,
    generateSimpleCode,
    proceduralExampleBucketId,
    videoExampleBucketId,
    generateCodeTheme,
    titleCase,
    textExampleBucketId,
    simpleVersionedExampleShareId,
    managedExampleShareId,
    proceduralExampleShareId,
    videoExampleShareId,
    textExampleShareId,
  } from "@slopmachine/demo-shared";

  import { mode, ModeWatcher } from "mode-watcher";

  let theme = $state<"Auto" | "Light" | "Dark">("Auto");
  let videoTheme = $state<"Auto" | "Light" | "Dark">("Auto");

  let location = $state(DEFAULT_STATE.location);
  let weather = $state(DEFAULT_STATE.weather);

  let textLocation = $state(DEFAULT_STATE.location);
  let textWeather = $state(DEFAULT_STATE.weather);

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

  let textDetectedLocation = $state("");
  let textDetectedWeather = $state("");
  let textCoords = $state<{ lat: number | null; lon: number | null }>({
    lat: null,
    lon: null,
  });
  let textLocationAutoDisabled = $state(false);
  let textWeatherAutoDisabled = $state(false);

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

  $effect(() => {
    if (textLocation === "Auto") {
      textDetectedLocation = "Detecting...";
      fetchLocation()
        .then((data) => {
          textDetectedLocation = data.locName;
          if (data.lat && data.lon) {
            textCoords = {
              lat: data.lat,
              lon: data.lon,
            };
          }
        })
        .catch(() => {
          textDetectedLocation = "Unknown Location";
          textLocation = "London";
          textLocationAutoDisabled = true;
        });
    }
  });

  let effectiveLocation = $derived(
    location === "Auto" ? detectedLocation : location,
  );

  let textEffectiveLocation = $derived(
    textLocation === "Auto" ? textDetectedLocation : textLocation,
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

  $effect(() => {
    if (textWeather === "Auto") {
      if (
        textEffectiveLocation === "Detecting..." ||
        !textEffectiveLocation ||
        textCoords.lat === null ||
        textCoords.lon === null
      ) {
        textDetectedWeather = "Waiting for location...";
        return;
      }
      textDetectedWeather = "Detecting...";
      fetchWeather(textCoords.lat, textCoords.lon)
        .then((weatherDesc) => {
          textDetectedWeather = weatherDesc;
        })
        .catch(() => {
          textDetectedWeather = "Unknown Weather";
          textWeather = "Rainy";
          textWeatherAutoDisabled = true;
        });
    }
  });

  let effectiveWeather = $derived(
    weather === "Auto" ? detectedWeather : weather,
  );

  let textEffectiveWeather = $derived(
    textWeather === "Auto" ? textDetectedWeather : textWeather,
  );

  let effectiveTheme = $derived(
    theme === "Auto" ? titleCase(mode.current ?? "Light") : theme,
  );

  let effectiveVideoTheme = $derived(
    videoTheme === "Auto" ? titleCase(mode.current ?? "Light") : videoTheme,
  );

  let codeLocation = $derived(
    generateCodeLocation(location, detectedLocation, effectiveLocation),
  );
  let codeWeather = $derived(
    generateCodeWeather(weather, detectedWeather, effectiveWeather),
  );
  let textCodeLocation = $derived(
    generateCodeLocation(
      textLocation,
      textDetectedLocation,
      textEffectiveLocation,
    ),
  );
  let textCodeWeather = $derived(
    generateCodeWeather(textWeather, textDetectedWeather, textEffectiveWeather),
  );
  let codeTheme = $derived(generateCodeTheme(theme, mode.current ?? "light"));
  let codeVideoTheme = $derived(
    generateCodeTheme(videoTheme, mode.current ?? "light"),
  );

  let isLocationLoading = $derived(
    effectiveLocation === "Detecting..." || !effectiveLocation,
  );
  let isWeatherLoading = $derived(
    effectiveWeather === "Detecting..." ||
      effectiveWeather === "Waiting for location..." ||
      !effectiveWeather,
  );
  let isLoading = $derived(isLocationLoading || isWeatherLoading);

  let isTextLocationLoading = $derived(
    textEffectiveLocation === "Detecting..." || !textEffectiveLocation,
  );
  let isTextWeatherLoading = $derived(
    textEffectiveWeather === "Detecting..." ||
      textEffectiveWeather === "Waiting for location..." ||
      !textEffectiveWeather,
  );
  let isTextLoading = $derived(isTextLocationLoading || isTextWeatherLoading);

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
        href="http://slopmachine.dev/share/{simpleVersionedExampleShareId}"
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
          <Label>Bucket {simpleVersionedExampleBucketId}</Label>
          <iframe
            src="https://slopmachine.dev/embed/{simpleVersionedExampleShareId}?showTitle=false&showResults=false"
            width="100%"
            height="120"
            title="Bucket embed"
          ></iframe>
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
        href="http://slopmachine.dev/share/{managedExampleShareId}"
        class="text-primary text-underline font-bold"
        target="_blank"
      >
        Slop Machine
      </a>
      bucket, with specific changes allowed at runtime.
    </p>
    <ExampleComponent
      code={`<SlopImage
  bucket="${managedExampleBucketId}"
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
          quality="high"
          class="w-full h-full object-cover transition-opacity duration-500 aspect-square"
        />
      {/snippet}
      {#snippet controls()}
        <div class="space-y-2">
          <Label>Bucket {managedExampleBucketId}</Label>
          <iframe
            src="https://slopmachine.dev/embed/{managedExampleShareId}?showTitle=false&showResults=false"
            width="100%"
            height="120"
            title="Bucket embed"
          ></iframe>
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
        href="http://slopmachine.dev/share/{proceduralExampleShareId}"
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
  bucketId="${proceduralExampleBucketId}"
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
            quality="high"
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
          <Label>Bucket {proceduralExampleBucketId}</Label>
          <iframe
            src="https://slopmachine.dev/embed/{proceduralExampleShareId}?showTitle=false&showResults=false"
            width="100%"
            height="120"
            title="Bucket embed"
          ></iframe>
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

  <div class="space-y-2">
    <h2 class="font-subheading">Video Example</h2>
    <p class="text-foreground/50">
      Generate a video based on a
      <a
        href="http://slopmachine.dev/share/{videoExampleShareId}"
        class="text-primary text-underline font-bold"
        target="_blank"
      >
        Slop Machine
      </a>
      bucket, passing variables to configure the output.
    </p>
    <ExampleComponent
      code={`<SlopVideo
  bucketId="${videoExampleBucketId}"
  variables={{
    theme: ${codeVideoTheme}
  }}
/>`}
    >
      {#snippet output()}
        <SlopVideo
          bucketId={videoExampleBucketId}
          variables={{ theme: effectiveVideoTheme }}
          class="w-full h-full object-cover transition-opacity duration-500"
        />
      {/snippet}

      {#snippet controls()}
        <div class="space-y-2">
          <Label>Bucket {videoExampleBucketId}</Label>
          <iframe
            src="https://slopmachine.dev/embed/{videoExampleShareId}?showTitle=false&showResults=false"
            width="100%"
            height="120"
            title="Bucket embed"
          ></iframe>
        </div>

        <div class="space-y-2">
          <Label>Theme</Label>
          <Select.Root type="single" bind:value={videoTheme}>
            <Select.Trigger class="w-full">
              {videoTheme}
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

  <div class="space-y-2">
    <h2 class="font-subheading">Text Example</h2>
    <p class="text-foreground/50">
      Generate text based on a
      <a
        href="http://slopmachine.dev/share/{textExampleShareId}"
        class="text-primary text-underline font-bold"
        target="_blank"
      >
        Slop Machine
      </a>
      bucket, passing variables to configure the output.
    </p>
    <ExampleComponent
      code={`<SlopText
  bucketId="${textExampleBucketId}"
  variables={{
    location: ${textCodeLocation}
    weather: ${textCodeWeather}
  }}
/>`}
    >
      {#snippet output()}
        {#if isTextLoading}
          <div class="w-full h-full flex items-center justify-center bg-muted">
            <p class="text-muted-foreground animate-pulse">
              Generating parameters...
            </p>
          </div>
        {:else}
          <SlopText
            bucketId={textExampleBucketId}
            variables={{
              location: textEffectiveLocation,
              weather: textEffectiveWeather,
            }}
            class="p-2"
          />
        {/if}
      {/snippet}

      {#snippet controls()}
        <div class="space-y-2">
          <Label>Bucket {textExampleBucketId}</Label>
          <iframe
            src="https://slopmachine.dev/embed/{textExampleShareId}?showTitle=false&showResults=false"
            width="100%"
            height="120"
            title="Bucket embed"
          ></iframe>
        </div>

        <div class="space-y-2">
          <Label>Location</Label>
          <Select.Root type="single" bind:value={textLocation}>
            <Select.Trigger class="w-full">
              {textLocation}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="Auto" disabled={textLocationAutoDisabled}
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
          <Select.Root type="single" bind:value={textWeather}>
            <Select.Trigger class="w-full">
              {textWeather}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="Auto" disabled={textWeatherAutoDisabled}
                >Auto</Select.Item
              >
              {#each DROPDOWN_OPTIONS.weather as opt}
                <Select.Item value={opt.value}>{opt.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      {/snippet}
    </ExampleComponent>
  </div>
</div>
