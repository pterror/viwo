import sharp from "sharp";

export function filterImage(
  image: Buffer,
  type: "blur" | "sharpen" | "grayscale",
): Promise<Buffer> {
  const pipeline = sharp(image);

  switch (type) {
    case "blur": {
      return pipeline.blur(5).toBuffer();
    }
    case "sharpen": {
      return pipeline.sharpen().toBuffer();
    }
    case "grayscale": {
      // Use toColorspace to actually convert to grayscale (reduces channels)
      return pipeline.toColorspace("b-w").toBuffer();
    }
  }
}
