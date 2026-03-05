<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import { cn, type WithoutChild } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    children,
    size = "default",
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> & {
    size?: "sm" | "default";
  } = $props();
</script>

<SelectPrimitive.Trigger
  bind:ref
  data-slot="select-trigger"
  data-size={size}
  class={cn(
    "border-input data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-foreground",
    "focus-visible:border-ring focus-visible:ring-ring/50",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    "dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 whitespace-nowrap",
    "transition-[color,box-shadow] outline-none focus-visible:ring-[3px]",
    "disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "h-10 rounded-sm border-2 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground shadow-retro-sm",
    "focus:shadow-retro-lg focus:outline-none focus:ring-2 focus:ring-primary focus-visible:outline-none",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronDownIcon class="size-4 opacity-50" />
</SelectPrimitive.Trigger>
