<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { CodeBlock, CodeBlockCopyButton } from './ui/code-block';
	import type { Snippet } from 'svelte';

	interface Props {
		controls: Snippet;
		output: Snippet;
		code: string;
		title?: string;
	}

	let {
		controls,
		output,
		code,
		title = 'Context Variables'
	}: Props = $props();
</script>

<div class="grid grid-cols-2 gap-0 items-stretch shadow-retro-lg">
	<!-- Output -->
	<div class="col-span-2 md:col-span-1 overflow-hidden rounded-none rounded-tr-sm border-2 border-neutral-800 border-b-0">
		{@render output()}
	</div>

	<!-- Controls -->
	<Card.Root class="col-span-2 md:col-span-1 bg-background rounded-none rounded-tl-sm border-2 border-neutral-800 border-b-0 border-r-none">
		<Card.Header>
			<Card.Title>{title}</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			{@render controls()}
		</Card.Content>
	</Card.Root>

	<!-- Code -->
	<div class="col-span-2 overflow-hidden rounded-none rounded-b-sm border-2 border-neutral-800">
		<CodeBlock
			class="rounded-none rounded-b-sm border-none"
			{code}
			language="svelte"
			showLineNumbers
			wrap
		>
			<CodeBlockCopyButton />
		</CodeBlock>
	</div>
</div>