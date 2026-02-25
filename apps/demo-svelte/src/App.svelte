<script lang="ts">
  import { SlopImage } from '@slopmachine/svelte';
</script>

<main>
  <h1>Slopmachine Svelte Demo</h1>
  <div class="demo-container">
    <SlopImage
      prompt="A beautiful random photo"
      class="demo-image"
    />
  </div>
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: sans-serif;
  }
  .demo-container {
    margin-top: 2rem;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    display: inline-block;
  }
</style>
