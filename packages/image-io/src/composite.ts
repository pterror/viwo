import sharp from "sharp";

export function compositeImages(
  base: Buffer,
  overlay: Buffer,
  x: number,
  y: number,
): Promise<Buffer> {
  return sharp(base)
    .composite([
      {
        input: overlay,
        left: x,
        top: y,
      },
    ])
    .toBuffer();
}
