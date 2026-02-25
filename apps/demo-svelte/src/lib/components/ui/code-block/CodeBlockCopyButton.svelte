<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { getContext } from 'svelte';
	import { Check, Copy } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { ComponentProps } from 'svelte';

	interface Props extends Partial<ComponentProps<typeof Button>> {
		onCopy?: () => void;
		onError?: (error: Error) => void;
		timeout?: number;
		children?: Snippet;
		class?: string;
	}

	let {
		onCopy,
		onError,
		timeout = 2000,
		class: className,
		children,
		...restProps
	}: Props = $props();

	let isCopied = $state(false);

	const context = getContext<{ code: string }>('CodeBlockContext');

	async function copyToClipboard() {
		if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
			onError?.(new Error('Clipboard API not available'));
			return;
		}

		try {
			await navigator.clipboard.writeText(context.code);
			isCopied = true;
			onCopy?.();
			setTimeout(() => {
				isCopied = false;
			}, timeout);
		} catch (error) {
			onError?.(error as Error);
		}
	}
</script>

<Button
	class={cn('shrink-0', className)}
	onclick={copyToClipboard}
	size="icon"
	variant="ghost"
	{...restProps}
>
	{#if children}
		{@render children()}
	{:else if isCopied}
		<Check size={14} />
	{:else}
		<Copy size={14} />
	{/if}
</Button>