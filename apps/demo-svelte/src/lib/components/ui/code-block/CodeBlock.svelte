<script lang="ts">
	import { cn } from '$lib/utils';
	import { setContext } from 'svelte';
	import { type BundledLanguage, codeToHtml, type ShikiTransformer } from 'shiki';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		code: string;
		language: BundledLanguage;
		showLineNumbers?: boolean;
		wrap?: boolean;
		children?: Snippet;
	}

	let {
		code,
		language,
		showLineNumbers = false,
		wrap = false,
		class: className,
		children,
		...restProps
	}: Props = $props();

	let html = $state('');
	let darkHtml = $state('');

	// Provide code to children (e.g., CodeBlockCopyButton)
	setContext('CodeBlockContext', {
		get code() {
			return code;
		}
	});

	const lineNumberTransformer: ShikiTransformer = {
		name: 'line-numbers',
		line(node, line) {
			node.children.unshift({
				type: 'element',
				tagName: 'span',
				properties: {
					className: [
						'inline-block',
						'min-w-10',
						'mr-4',
						'text-right',
						'select-none',
						'text-muted-foreground'
					]
				},
				children: [{ type: 'text', value: String(line) }]
			});
		}
	};

	async function highlightCode(c: string, l: BundledLanguage, s: boolean) {
		const transformers: ShikiTransformer[] = s ? [lineNumberTransformer] : [];

		const [light, dark] = await Promise.all([
			codeToHtml(c, {
				lang: l,
				theme: 'one-light',
				transformers
			}),
			codeToHtml(c, {
				lang: l,
				theme: 'one-dark-pro',
				transformers
			})
		]);
		return { light, dark };
	}

	$effect(() => {
		let active = true;
		highlightCode(code, language, showLineNumbers).then(({ light, dark }) => {
			if (active) {
				html = light;
				darkHtml = dark;
			}
		});
		return () => {
			active = false;
		};
	});
</script>

<div
	class={cn(
		'group relative w-full overflow-hidden rounded-md border bg-background dark:bg-neutral-950 text-foreground',
		className
	)}
	{...restProps}
>
	<div class="relative">
		<div
			class={cn(
				'overflow-auto dark:hidden [&>pre]:m-0 [&>pre]:bg-background dark:[&>pre]:bg-neutral-950! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm',
				wrap && '[&>pre]:whitespace-pre-wrap [&>pre]:wrap-break-word'
			)}
		>
			{@html html}
		</div>
		<div
			class={cn(
				'hidden overflow-auto dark:block [&>pre]:m-0 [&>pre]:bg-background dark:[&>pre]:bg-neutral-950! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm',
				wrap && '[&>pre]:whitespace-pre-wrap [&>pre]:wrap-break-word'
			)}
		>
			{@html darkHtml}
		</div>
		{#if children}
			<div class="absolute top-2 right-2 flex items-center gap-2">
				{@render children()}
			</div>
		{/if}
	</div>
</div>