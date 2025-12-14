import sharp from "sharp";

export async function transformImage(
  image: Buffer,
  rotation: number,
  scale: number,
): Promise<Buffer> {
  let pipeline = sharp(image);

  if (rotation !== 0) {
    pipeline = pipeline.rotate(rotation);
  }

  if (scale !== 1) {
    const metadata = await sharp(image).metadata();
    const newWidth = Math.round((metadata.width ?? 512) * scale);
    const newHeight = Math.round((metadata.height ?? 512) * scale);
    pipeline = pipeline.resize(newWidth, newHeight);
  }

  return pipeline.toBuffer();
}
