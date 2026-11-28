export { SlopImage, type SlopImageProps } from "./components/SlopImage";
export { SlopVideo, type SlopVideoProps } from "./components/SlopVideo";
export { SlopText, type SlopTextProps } from "./components/SlopText";
export {
  useSlopPipeline,
  type UseSlopPipelineOptions,
  type UseSlopPipelineResult,
} from "./useSlopPipeline";
export type { SlopErrorFallback } from "./components/ErrorOverlay";

export type {
  AspectRatio,
  ImageAspectRatio,
  VideoAspectRatio,
  SlopImageOptions,
  SlopVideoOptions,
  SlopTextOptions,
  SlopPipelineOptions,
  ExecutePipelineOptions,
  PipelineResult,
  PipelineStepResult,
} from "@slopmachine/core";

export {
  preloadImage,
  preloadVideo,
  preloadText,
  executePipeline,
  buildPipelineUrl,
  mapStepResults,
  SlopMachineError,
} from "@slopmachine/core";
