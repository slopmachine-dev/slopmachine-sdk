---
description: Slop Machine SDK documentation, features, and demo links.
layout: home

hero:
  name: "Slop Machine"
  text: "Brand-safe generative assets"
  tagline: "100x your mediocrity"
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: React Demo
      link: https://slopmachine-dev.github.io/slopmachine-sdk/demo-react/
    - theme: alt
      text: Svelte Demo
      link: https://slopmachine-dev.github.io/slopmachine-sdk/demo-svelte/

features:
  - title: React Support
    details: "Fully typed and ready-to-use `SlopImage` component for React."
    icon:
      src: https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage?bucketId=iSjKmXd8pUziYmvtMHek&resultId=xITopgtsdLjwTBGNhUsN
      width: 100px
      height: 100px
  - title: Svelte Support
    details: "Native Svelte `SlopImage` component for seamless integration."
    icon:
      src: https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage?bucketId=iSjKmXd8pUziYmvtMHek&resultId=5EtbARLIlesyoU9VbolH
      width: 100px
      height: 100px
---

<script setup>
import { onMounted } from 'vue'
import { preloadImage, preloadVideo, preloadText } from '../../packages/core/src/index.ts'
import { fetchLocation, fetchWeather } from '../../packages/demo-shared/src/utils.ts'

onMounted(() => {
  // Simple Example
  preloadImage({ bucketId: 'ERoiCqBgrKqwTjhxcHJw' })

  // Controlled Example
  preloadImage({
    bucketId: 'fFzg3gpfI03VdjTekcQd',
    variables: { textcolor: 'black', bgcolor: 'white', slopcolor: 'pink' }
  })

  // Dynamic Preloads
  const theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'
  
  fetchLocation()
    .then(data => fetchWeather(data.lat, data.lon))
    .then(data => {
      const location = data.locName || 'London'
      const weather = data.weatherDesc || 'Rainy'

      // Procedural Example
      preloadImage({
        bucketId: '0Risb3L5eS76tidF3ug9',
        variables: { location, weather, theme }
      })

      // Video Example
      preloadVideo({
        bucketId: 'i7ydY0005DyuXyUgj7tl',
        variables: { theme }
      })

      // Text Example
      preloadText({
        bucketId: 'A4arl0ziUSIbrUBFsQSO',
        variables: { location, weather }
      })
    })
    .catch(() => {
      // Procedural Example Fallback
      preloadImage({
        bucketId: '0Risb3L5eS76tidF3ug9',
        variables: { location: 'London', weather: 'Rainy', theme }
      })

      // Video Example Fallback
      preloadVideo({
        bucketId: 'i7ydY0005DyuXyUgj7tl',
        variables: { theme }
      })

      // Text Example Fallback
      preloadText({
        bucketId: 'A4arl0ziUSIbrUBFsQSO',
        variables: { location: 'London', weather: 'Rainy' }
      })
    })
})
</script>

<style>
html.dark .light-img { display: none; }
html:not(.dark) .dark-img { display: none; }
</style>

<div style="display: flex; justify-content: center; width: 100%; padding: 2rem 0;">
  <!-- Light mode image -->
  <img class="light-img" src="https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage?bucketId=0Risb3L5eS76tidF3ug9&resultId=C7rAqS6PkHL70lyHLVtV" alt="Slop Machine infographic" style="width: 100%; border: 3px solid #000; box-shadow: 6px 6px 0 #000; border-radius: 0.5rem;" />
  <!-- Dark mode image -->
  <img class="dark-img" src="https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage?bucketId=0Risb3L5eS76tidF3ug9&resultId=1e5mhTxy3BOsaSzV8YSU" alt="Slop Machine infographic" style="width: 100%; border: 3px solid #fff; box-shadow: 6px 6px 0 #fff; border-radius: 0.5rem;" />
</div>
