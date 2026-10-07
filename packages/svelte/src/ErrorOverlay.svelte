<!--
  @component
  Internal overlay shown over the media slot when generation or loading fails.
  Renders the consumer's `errorFallback` snippet if provided, otherwise a default message.
-->
<script lang="ts">
  import type { SlopMachineError } from "@slopmachine/core";
  import type { Snippet } from "svelte";

  interface Props {
    error: SlopMachineError;
    errorFallback?: Snippet<[{ error: SlopMachineError }]>;
    /**
     * Message shown by the default error UI, e.g. "Failed to load image".
     */
    label: string;
  }

  let { error, errorFallback, label }: Props = $props();
</script>

{#if errorFallback}
  <div class="overlay">
    {@render errorFallback({ error })}
  </div>
{:else}
  <div class="overlay default" title={error.message}>
    <div class="content">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{label}</span>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .overlay.default {
    background-color: var(--muted, #f3f4f6);
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--muted-foreground, #6b7280);
  }

  svg {
    width: 24px;
    height: 24px;
  }

  span {
    font-size: 0.75rem;
  }
</style>
