declare module '@saltcorn/docling' {
  export function extract(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ text: string; [key: string]: any }>; // Basic type, can be expanded if more structure is known
  // Add other functions or types if known and needed
}
