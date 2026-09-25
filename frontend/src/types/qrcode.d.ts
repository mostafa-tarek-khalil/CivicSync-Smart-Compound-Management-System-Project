declare module 'qrcode' {
  export function toDataURL(
    text: string,
    options?: { errorCorrectionLevel?: string; margin?: number; width?: number }
  ): Promise<string>;
}
