declare module 'qrcode-terminal' {
  export function generate(text: string, options?: { small?: boolean }): void
  export function generate(
    text: string,
    options: { small?: boolean } | undefined,
    cb: (qr: string) => void,
  ): void
}
