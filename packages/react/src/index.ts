export { SlopImage, type SlopImageProps } from "./components/SlopImage";
export { SlopVideo, type SlopVideoProps } from "./components/SlopVideo";
export { SlopText, type SlopTextProps } from "./components/SlopText";

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
