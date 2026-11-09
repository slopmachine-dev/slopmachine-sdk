export { SlopImage, type SlopImageProps } from "./components/SlopImage";
export { SlopVideo, type SlopVideoProps } from "./components/SlopVideo";
export { SlopText, type SlopTextProps } from "./components/SlopText";
export type { SlopErrorFallback } from "./components/ErrorOverlay";

export type {
  ImageAspectRatio,
  VideoAspectRatio,
  SlopImageOptions,
  SlopVideoOptions,
  SlopTextOptions,
} from "@slopmachine/core";

export {
  preloadImage,
  preloadVideo,
  preloadText,
  SlopMachineError,
} from "@slopmachine/core";
