import sharp from "sharp";

export async function filterImage(
  image: Buffer,
  type: "blur" | "sharpen" | "grayscale",
): Promise<Buffer> {
  const pipeline = sharp(image);

  switch (type) {
    case "blur":
      return pipeline.blur(5).toBuffer();
    case "sharpen":
      return pipeline.sharpen().toBuffer();
    case "grayscale":
      return pipeline.grayscale().toBuffer();
  }
}
