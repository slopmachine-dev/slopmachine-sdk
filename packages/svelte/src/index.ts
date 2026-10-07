export { default as SlopImage, type SlopImageProps } from "./SlopImage.svelte";
export { default as SlopVideo, type SlopVideoProps } from "./SlopVideo.svelte";
export { default as SlopText } from "./SlopText.svelte";
export type {
  ImageAspectRatio,
  VideoAspectRatio,
  SlopImageOptions,
  SlopVideoOptions,
  SlopTextOptions,
  ResultRating,
  RateResultOptions,
  RateResultResponse,
} from "@slopmachine/core";

export {
  preloadImage,
  preloadVideo,
  preloadText,
  rateResult,
} from "@slopmachine/core";
