declare module "heic-decode" {
  interface HeicImage {
    width: number;
    height: number;
    data: Uint8Array;
  }

  interface DecodeOptions {
    buffer: ArrayBuffer | Buffer;
  }

  interface DecodeAllOptions extends DecodeOptions {
    all: true;
  }

  function decode(options: DecodeAllOptions): Promise<HeicImage[]>;
  function decode(options: DecodeOptions): Promise<HeicImage>;

  export = decode;
}
