<script lang="ts">
  import { buildImageUrl, type SlopMachineOptions } from "@slopmachine/core";

  interface Props {
    prompt: string;
    aspectRatio?: string;
    variables?: Record<string, string | number | undefined | null>;
    baseUrl?: string;
    class?: string;
    [key: string]: any;
  }

  let {
    prompt,
    aspectRatio = "1:1",
    variables = {},
    baseUrl = undefined,
    class: className = "",
    ...restProps
  }: Props = $props();

  let isLoading = $state(true);

  let src = $derived(buildImageUrl({ prompt, aspectRatio, variables, baseUrl }));
  let prevSrc = $state("");

  $effect(() => {
    if (src !== prevSrc) {
      isLoading = true;
      prevSrc = src;
    }
  });

  function handleLoad() {
    isLoading = false;
  }
</script>

<div
  class="slop-wrapper {className}"
  style="aspect-ratio: {aspectRatio.replace(':', '/')};"
>
  {#if isLoading}
    <div class="loading-overlay">
      <div class="spinner-container">
        <svg
          class="spinner"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>Loading...</span>
      </div>
    </div>
    <div class="shimmer-effect"></div>
  {/if}

  <img
    {src}
    alt={prompt}
    onload={handleLoad}
    class:loaded={!isLoading}
    {...restProps}
  />
</div>

<style>
  .slop-wrapper {
    position: relative;
    overflow: hidden;
    background-color: var(--muted, #f3f4f6);
    width: 100%;
    height: 100%;
  }

  .loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--muted, #f3f4f6);
    transition: opacity 300ms ease-in-out;
  }

  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .spinner {
    width: 24px;
    height: 24px;
    color: var(--muted-foreground, #6b7280);
    animation: slop-spin 1s linear infinite;
  }
  .spinner circle { opacity: 0.25; }
  .spinner path { opacity: 0.75; }

  .spinner-container span {
    font-size: 0.75rem;
    color: var(--muted-foreground, #6b7280);
  }

  .shimmer-effect {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
      90deg,
      var(--muted, #f3f4f6) 0%,
      var(--muted-foreground, #e5e7eb) 50%,
      var(--muted, #f3f4f6) 100%
    );
    background-size: 200% 100%;
    animation: slop-shimmer 2s ease-in-out infinite;
  }

  img {
    height: 100%;
    width: 100%;
    object-fit: cover;
    transition: opacity 500ms;
    opacity: 0;
  }

  img.loaded {
    opacity: 1;
  }

  @keyframes slop-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes slop-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>