<script lang="ts">
	import { SlopImage } from '@slopmachine/svelte';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import ExampleComponent from './lib/components/ExampleComponent.svelte';
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
		getManagedSrc
	} from '@slopmachine/demo-shared';
  	import { ModeWatcher } from 'mode-watcher';
	

	let location = $state('Auto');
	let weather = $state('Auto');
	let style = $state('Oil Painting');
	let date = $state(new Date().toLocaleDateString());

	let result = $state('Auto');
	let version = $state('Auto');

	let bgColor = $state('white');
	let textColor = $state('black');
	let slopColor = $state('pink');

	let detectedLocation = $state('');
	let detectedWeather = $state('');
	let coords = $state<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
	let locationAutoDisabled = $state(false);
	let weatherAutoDisabled = $state(false);

	$effect(() => {
		if (location === 'Auto') {
			detectedLocation = 'Detecting...';
			fetchLocation()
				.then((data) => {
					detectedLocation = data.locName;
					if (data.lat && data.lon) {
						coords = {
							lat: data.lat,
							lon: data.lon
						};
					}
				})
				.catch(() => {
					detectedLocation = 'Unknown Location';
					location = 'London';
					locationAutoDisabled = true;
				});
		}
	});

	let effectiveLocation = $derived(location === 'Auto' ? detectedLocation : location);

	$effect(() => {
		if (weather === 'Auto') {
			if (
				effectiveLocation === 'Detecting...' ||
				!effectiveLocation ||
				coords.lat === null ||
				coords.lon === null
			) {
				detectedWeather = 'Waiting for location...';
				return;
			}
			detectedWeather = 'Detecting...';
			fetchWeather(coords.lat, coords.lon)
				.then((weatherDesc) => {
					detectedWeather = weatherDesc;
				})
				.catch(() => {
					detectedWeather = 'Unknown Weather';
					weather = 'Rainy';
					weatherAutoDisabled = true;
				});
		}
	});

	let effectiveWeather = $derived(weather === 'Auto' ? detectedWeather : weather);

	let codeLocation = $derived(
		location === 'Auto' ? `getLocation(), // ${detectedLocation}` : `"${effectiveLocation}",`
	);
	let codeWeather = $derived(
		weather === 'Auto' ? `getWeather(getLocation()), // ${detectedWeather}` : `"${effectiveWeather}",`
	);

	let isLocationLoading = $derived(
		location === 'Auto' && (detectedLocation === 'Detecting...' || !detectedLocation)
	);
	let isWeatherLoading = $derived(
		weather === 'Auto' &&
			(detectedWeather === 'Detecting...' ||
				detectedWeather === 'Waiting for location...' ||
				!detectedWeather)
	);
	let isLoading = $derived(isLocationLoading || isWeatherLoading);

	let effectiveVersion = $derived(version === 'Auto' ? 'v2' : version);

	let currentResultOptions = $derived(effectiveVersion === 'v1' ? resultOptionsV1 : resultOptionsV2);

	let managedSrc = $derived.by(() => getManagedSrc(effectiveVersion, result));

	let versionLabel = $derived(versionOptions.find((o) => o.value === version)?.label || version);
	let resultLabel = $derived(
		currentResultOptions.find((o) => o.value === result)?.label || result
	);

	let hasVersion = $derived(version !== 'Auto');
	let hasResult = $derived(result !== 'Auto');
	let hasProps = $derived(hasVersion || hasResult);

	let managedCode = $derived.by(() => {
		if (hasProps) {
			let code = `<SlopImage\n  bucket="WhQq52dMlu6LIEotNUG"`;
			if (hasVersion) code += `\n  version="${versionLabel}"`;
			if (hasResult) code += `\n  result="${resultLabel}"`;
			code += `\n/>`;
			return code;
		} else {
			return `<SlopImage bucket="WhQq52dMlu6LIEotNUG" />`;
		}
	});
</script>

<ModeWatcher />
<div class="min-h-screen p-8 font-sans max-w-4xl mx-auto space-y-12">
	<div class="flex justify-between items-center border-b pb-4">
		<h1 class="text-4xl font-heading">Slop Machine Svelte SDK Demo</h1>
		<a
			href={window.location.pathname.replace(/\/svelte\/?$/, '') + '/'}
			class="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
		>
			Switch to React Demo &rarr;
		</a>
	</div>

	<div class="space-y-2">
		<h2 class="font-subheading">Basic Example</h2>
		<p class="text-foreground/50">Image with prompt provided at runtime.</p>
		<ExampleComponent
			code={`<SlopImage\n  prompt="${basicExamplePrompt}"\n  variables={{\n    location: ${codeLocation}\n    weather: ${codeWeather}\n    style: "${style}",\n    date: new Date().toLocaleDateString()\n  }}\n/>`}
		>
			{#snippet output()}
				{#if isLoading}
					<div class="w-full h-full flex items-center justify-center bg-muted aspect-square">
						<p class="text-muted-foreground animate-pulse">Generating parameters...</p>
					</div>
				{:else}
					<SlopImage
						prompt={basicExamplePrompt}
						model="gemini-flash"
						variables={{
							location: effectiveLocation,
							weather: effectiveWeather,
							style,
							date
						}}
						class="w-full h-full object-cover transition-opacity duration-500 aspect-square"
					/>
				{/if}
			{/snippet}

			{#snippet controls()}
				<div class="space-y-2">
					<Label>Location</Label>
					<Select.Root type="single" bind:value={location}>
						<Select.Trigger class="w-full">
							{location}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="Auto" disabled={locationAutoDisabled}>Auto</Select.Item>
							<Select.Item value="London">London</Select.Item>
							<Select.Item value="Tokyo">Tokyo</Select.Item>
							<Select.Item value="New York">New York</Select.Item>
							<Select.Item value="Mars">Mars</Select.Item>
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
							<Select.Item value="Auto" disabled={weatherAutoDisabled}>Auto</Select.Item>
							<Select.Item value="Rainy">Rainy</Select.Item>
							<Select.Item value="Sunny">Sunny</Select.Item>
							<Select.Item value="Snowing">Snowing</Select.Item>
							<Select.Item value="Apocalyptic">Apocalyptic</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label>Style</Label>
					<Select.Root type="single" bind:value={style}>
						<Select.Trigger class="w-full">
							{style}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="Oil Painting">Oil Painting</Select.Item>
							<Select.Item value="Cyberpunk">Cyberpunk</Select.Item>
							<Select.Item value="Minimalist Vector">Minimalist Vector</Select.Item>
							<Select.Item value="Claymation">Claymation</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Date</Label>
					<p class="bg-background p-2 rounded-sm">{date}</p>
				</div>
			{/snippet}
		</ExampleComponent>
	</div>

	<div class="space-y-2">
		<h2 class="font-subheading">Managed Example</h2>
		<p class="text-foreground/50">
			Image based on a
			<a href="http://slopmachine.dev" class="text-primary text-underline font-bold" target="_blank">
				Slop Machine
			</a>
			bucket.
		</p>
		<ExampleComponent code={managedCode}>
			{#snippet output()}
				<img
					src={managedSrc}
					alt={version === 'v1' ? managedExamplePromptV1 : managedExamplePromptV2}
					class="w-full h-full object-cover transition-opacity duration-500 aspect-square"
				/>
			{/snippet}
			{#snippet controls()}
				<div class="space-y-2">
					<Label>Bucket</Label>
					<p class="bg-background p-2 rounded-sm">fFzg3gpfI03VdjTekcQd</p>
				</div>
				<div class="space-y-2">
					<Label>Version</Label>
					<Select.Root type="single" bind:value={version}>
						<Select.Trigger class="w-full">
							{versionLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value={versionOptions[0].value}>{versionOptions[0].label}</Select.Item>
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
					<Label>Result</Label>
					<Select.Root type="single" bind:value={result}>
						<Select.Trigger class="w-full">
							{resultLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value={currentResultOptions[0].value}>{currentResultOptions[0].label}</Select.Item>
							<Select.Group>
								<Select.GroupHeading>Specific Result</Select.GroupHeading>
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
		<h2 class="font-subheading">Managed with Controls Example</h2>
		<p class="text-foreground/50">
			Image based on a
			<a href="http://slopmachine.dev" class="text-primary text-underline font-bold" target="_blank">
				Slop Machine
			</a>
			bucket, with variables provided at runtime.
		</p>
		<ExampleComponent
			code={`<SlopImage\n  bucket="WhQq52dMlu6LIEotNUG"\n  variables={{\n    textcolor: "${textColor}",\n    bgcolor: "${bgColor}",\n    slopcolor: "${slopColor}",\n  }}\n/>`}
		>
			{#snippet output()}
				<SlopImage
					prompt={managedWithControlsExamplePrompt}
					variables={{
						textcolor: textColor,
						bgcolor: bgColor,
						slopcolor: slopColor
					}}
					class="w-full h-full object-cover transition-opacity duration-500 aspect-square"
				/>
			{/snippet}
			{#snippet controls()}
				<div class="space-y-2">
					<Label>Bucket</Label>
					<p class="bg-background p-2 rounded-sm">fFzg3gpfI03VdjTekcQd</p>
				</div>

				<div class="space-y-2">
					<Label>Text Color</Label>
					<Select.Root type="single" bind:value={textColor}>
						<Select.Trigger class="w-full">
							{textColor.charAt(0).toUpperCase() + textColor.slice(1)}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="black">Black</Select.Item>
							<Select.Item value="white">White</Select.Item>
							<Select.Item value="gray">Gray</Select.Item>
							<Select.Item value="red">Red</Select.Item>
							<Select.Item value="blue">Blue</Select.Item>
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
							<Select.Item value="white">White</Select.Item>
							<Select.Item value="black">Black</Select.Item>
							<Select.Item value="gray">Gray</Select.Item>
							<Select.Item value="red">Red</Select.Item>
							<Select.Item value="blue">Blue</Select.Item>
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
							<Select.Item value="pink">Pink</Select.Item>
							<Select.Item value="green">Green</Select.Item>
							<Select.Item value="blue">Blue</Select.Item>
							<Select.Item value="yellow">Yellow</Select.Item>
							<Select.Item value="purple">Purple</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			{/snippet}
		</ExampleComponent>
	</div>
</div>
