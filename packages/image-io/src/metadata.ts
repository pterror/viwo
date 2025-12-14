import sharp from "sharp";
import ExifReader from "exifreader";

/**
 * Embed custom metadata into an image using EXIF UserComment
 */
export async function embedMetadata(
  image: Buffer,
  format: "png" | "jpeg" | "webp",
  metadata: object,
): Promise<Buffer> {
  const metadataStr = JSON.stringify(metadata);

  let pipeline = sharp(image);

  switch (format) {
    case "png": {
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    }
    case "jpeg": {
      pipeline = pipeline.jpeg();
      break;
    }
    case "webp": {
      pipeline = pipeline.webp();
      break;
    }
  }

  // Use EXIF UserComment which is widely supported
  return pipeline
    .withExif({
      IFD0: {
        UserComment: metadataStr,
      },
    })
    .toBuffer();
}

/**
 * Read custom metadata from an image
 */
export async function readMetadata(image: Buffer): Promise<object | null> {
  try {
    const tags = ExifReader.load(image);

    // Try to read UserComment
    if (tags.UserComment?.value) {
      try {
        let value: string;
        if (typeof tags.UserComment.value === "string") {
          value = tags.UserComment.value;
        } else if (Array.isArray(tags.UserComment.value)) {
          // UserComment is often an array of character codes
          // Skip the first 8 bytes (character code specification)
          const charCodes = tags.UserComment.value.slice(8);
          value = String.fromCharCode(...charCodes);
        } else {
          return null;
        }

        // Trim null bytes
        value = value.replace(/\u0000/g, "");

        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
}
