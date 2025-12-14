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
    // Important: get metadata AFTER rotation so we scale the rotated dimensions
    const intermediateBuffer = rotation !== 0 ? await pipeline.toBuffer() : image;
    const metadata = await sharp(intermediateBuffer).metadata();
    const newWidth = Math.round((metadata.width ?? 512) * scale);
    const newHeight = Math.round((metadata.height ?? 512) * scale);
    pipeline = sharp(intermediateBuffer).resize(newWidth, newHeight);
  }

  return pipeline.toBuffer();
}
