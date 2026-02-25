<script lang="ts">
	import { SlopImage } from '@slopmachine/svelte';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import ExampleComponent from './lib/components/ExampleComponent.svelte';

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
	let locationAutoDisabled = $state(false);
	let weatherAutoDisabled = $state(false);

	const v1r1src =
		'https://firebasestorage.googleapis.com/v0/b/slopmachine-12bfb.firebasestorage.app/o/generations%2FzwIwYUODVAYar7PeXz0U%2F1769871708268_0.png?alt=media&token=71d9fb84-6c38-494a-b7dc-5caba21a9902';
	const v1r2src =
		'https://firebasestorage.googleapis.com/v0/b/slopmachine-12bfb.firebasestorage.app/o/generations%2FdBGIpSyZu9BHgc028u3a%2F1769871727238_0.png?alt=media&token=ab3b7fcd-742c-42b2-a61f-10c61c45bd7a';
	const v2r1src =
		'https://firebasestorage.googleapis.com/v0/b/slopmachine-12bfb.firebasestorage.app/o/generations%2FxJiZNqDOR35Bop86saJM%2F1769872430321_0.png?alt=media&token=b4e3d9dd-91f5-4c61-b084-465d2d17f2e7';
	const v2r2src =
		'https://firebasestorage.googleapis.com/v0/b/slopmachine-12bfb.firebasestorage.app/o/generations%2F6uCftinejqT9DfbbyMHN%2F1769872405195_0.png?alt=media&token=26dfc00c-a776-49c2-9470-65c527132e48';
	const v2r3src =
		'https://firebasestorage.googleapis.com/v0/b/slopmachine-12bfb.firebasestorage.app/o/generations%2FDqacTLhrHg2amUmmgkZP%2F1769872400183_0.png?alt=media&token=3376302b-eb3c-4d43-9b6d-a13f3ab599cc';
	const v2r4src =
		'https://firebasestorage.googleapis.com/v0/b/slopmachine-12bfb.firebasestorage.app/o/generations%2FSRYuYGG31BmVZTSgkwPj%2F1769872393295_0.png?alt=media&token=7ceba14c-4f21-472f-9a9b-eb215e73abf7';
	const v2r5src =
		'https://firebasestorage.googleapis.com/v0/b/slopmachine-12bfb.firebasestorage.app/o/generations%2F6HGiYX3fSQWOloZfUq3v%2F1769872394150_0.png?alt=media&token=7190d6f2-8cdf-488b-ab96-d99054ce790d';

	$effect(() => {
		if (location === 'Auto') {
			detectedLocation = 'Detecting...';
			fetch('https://ipapi.co/country_name/')
				.then((res) => {
					if (!res.ok) throw new Error('Failed to fetch location');
					return res.text();
				})
				.then((data) => {
					detectedLocation = data.trim();
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
			if (effectiveLocation === 'Detecting...' || !effectiveLocation) {
				detectedWeather = 'Waiting for location...';
				return;
			}
			detectedWeather = 'Detecting...';
			fetch(`https://wttr.in/${encodeURIComponent(effectiveLocation)}?format=%C`)
				.then((res) => {
					if (!res.ok) throw new Error('Failed to fetch weather');
					return res.text();
				})
				.then((data) => {
					detectedWeather = data.trim();
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

	const basicExamplePrompt =
		"A beautiful scene in {location}, where the weather is {weather}, there are flying pigs in the background somewhere, and there is the text 'Slop Machine was here {date}', all in the style of {style}";

	const managedExamplePromptV1 =
		"A hyper-realistic, slightly dystopian product photo of a can of 'Premium Slop' sitting on a stark concrete pedestal. The can label is minimalist neobrutalist design, bold black Helvetica text on raw aluminum that reads 'CONTENT SUBSTITUTE'. The background is a soft, clinical laboratory white with harsh, dramatic shadows. A single, perfect, viscous drip of iridescent, glowing pink goo is running down the side of the can. 8k resolution, ray-traced reflections, high fashion editorial lighting, sterile aesthetic.";
	const managedExamplePromptV2 =
		"A 4:5 vertical, center-framed macro shot, hyper-realistic, slightly dystopian product photo of a weathered metal industrial pail sitting on a brutalist concrete plinth. The label on the pail is minimalist neobrutalist design, precisely rendered, bold black Helvetica text on rusted metal that reads 'CONTENT SUBSTITUTE'. The background is a soft, seamless matte white laboratory cove with subtle recessed panel lines with harsh, dramatic shadows. A single, perfect, viscous drip of iridescent, glowing opaque pink gloop is running down the side of the can. 8k resolution, ray-traced reflections, cinematic color grading with desaturated tones and a cold cyan tint in the shadows, high fashion editorial lighting with a shallow depth of field (f/2.8) to softly blur the clinical background, sterile aesthetic .";

	const managedWithControlsExamplePrompt =
		"A 4:5 vertical, center-framed macro shot, hyper-realistic, slightly dystopian product photo of a weathered metal industrial pail sitting on a brutalist concrete plinth. The label on the pail is minimalist neobrutalist design, precisely rendered, bold {textcolor} Helvetica text on rusted metal that reads 'CONTENT SUBSTITUTE'. The background is a soft, seamless matte {bgcolor} laboratory cove with subtle recessed panel lines with harsh, dramatic shadows. A single, perfect, viscous drip of iridescent, glowing opaque {slopcolor} gloop is running down the side of the can. 8k resolution, ray-traced reflections, cinematic color grading with desaturated tones and a cold cyan tint in the shadows, high fashion editorial lighting with a shallow depth of field (f/2.8) to softly blur the clinical background, sterile aesthetic .";

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

	const versionOptions = [
		{ value: 'Auto', label: 'Auto (Latest)' },
		{ value: 'v2', label: '2' },
		{ value: 'v1', label: '1' }
	];

	const resultOptionsV1 = [
		{ value: 'Auto', label: 'Auto (Most Recently Approved)' },
		{ value: 'r2', label: 'M54AC7Cq3ceE1GKwiSiI' },
		{ value: 'r1', label: 'SSxQEJ19WDBUhT14h98H' }
	];

	const resultOptionsV2 = [
		{ value: 'Auto', label: 'Auto (Most Recently Approved)' },
		{ value: 'r5', label: '9gpgLjG4rgKfbgo3D8rF' },
		{ value: 'r4', label: 'A19Ro6EPsnXxfqlNmmWo' },
		{ value: 'r3', label: 'GUEOINjZL2Ij3nju0Zah' },
		{ value: 'r2', label: 'JwQ5KffuLwn9J78PjI4W' },
		{ value: 'r1', label: 'M0xuW8bq9xs3jH7HE7QE' }
	];

	let currentResultOptions = $derived(effectiveVersion === 'v1' ? resultOptionsV1 : resultOptionsV2);

	let managedSrc = $derived.by(() => {
		if (effectiveVersion === 'v1') {
			if (result === 'r1') return v1r1src;
			return v1r2src;
		}
		if (result === 'r1') return v2r1src;
		if (result === 'r2') return v2r2src;
		if (result === 'r3') return v2r3src;
		if (result === 'r4') return v2r4src;
		if (result === 'r5') return v2r5src;
		return v2r5src;
	});

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

<div class="min-h-screen p-8 font-sans max-w-4xl mx-auto space-y-12">
	<h1 class="text-4xl font-heading">Slop Machine SDK Demo</h1>

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
