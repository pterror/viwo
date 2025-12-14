import sharp from "sharp";

export function embedMetadata(
  image: Buffer,
  format: "png" | "jpeg" | "webp",
  metadata: object,
): Promise<Buffer> {
  const metadataStr = JSON.stringify(metadata);

  if (format === "png") {
    // Use PNG tEXt chunks via EXIF
    return sharp(image)
      .png({ compressionLevel: 9 })
      .withMetadata({
        exif: {
          IFD0: {
            ImageDescription: metadataStr,
          },
        },
      })
      .toBuffer();
  }

  // JPEG/WebP use EXIF
  return sharp(image)
    .withMetadata({
      exif: {
        IFD0: {
          ImageDescription: metadataStr,
        },
      },
    })
    .toBuffer();
}

export async function readMetadata(image: Buffer): Promise<object | null> {
  const metadata = await sharp(image).metadata();

  if (metadata.exif) {
    try {
      // Try to parse ImageDescription from EXIF
      const buffer = metadata.exif as Buffer;
      const exifStr = buffer.toString();
      // Look for ImageDescription in the EXIF data
      const match = exifStr.match(/ImageDescription[^\u0000]*\u0000([^\u0000]+)/);
      if (match?.[1]) {
        return JSON.parse(match[1]);
      }
    } catch {
      return null;
    }
  }

  return null;
}
