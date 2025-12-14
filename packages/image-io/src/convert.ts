import sharp from "sharp";
import { embedMetadata, readMetadata } from "./metadata";

export async function convertImage(
  image: Buffer,
  to: "png" | "jpeg" | "webp",
  options: { quality?: number; preserveMetadata?: boolean } = {},
): Promise<Buffer> {
  const metadata = options.preserveMetadata ? await readMetadata(image) : null;

  let result = sharp(image);

  switch (to) {
    case "png": {
      result = result.png({ compressionLevel: 9 });
      break;
    }
    case "jpeg": {
      result = result.jpeg({ quality: options.quality ?? 90 });
      break;
    }
    case "webp": {
      result = result.webp({ quality: options.quality ?? 90 });
      break;
    }
  }

  const converted = await result.toBuffer();

  if (metadata) {
    return embedMetadata(converted, to, metadata);
  }

  return converted;
}
