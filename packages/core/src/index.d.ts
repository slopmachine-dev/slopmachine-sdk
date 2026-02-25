export interface SlopMachineOptions {
    prompt: string;
    aspectRatio?: string;
    variables?: Record<string, string | number | undefined | null>;
    baseUrl?: string;
}
export declare function interpolatePrompt(prompt: string, variables?: Record<string, string | number | undefined | null>): string;
export declare function buildImageUrl(options: SlopMachineOptions): string;
