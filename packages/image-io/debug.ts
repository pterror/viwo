import sharp from "sharp";
import { embedMetadata } from "./src/metadata";

async function debug() {
  // Create a test image
  const image = await sharp({
    create: {
      background: { b: 0, g: 0, r: 255 },
      channels: 3,
      height: 100,
      width: 100,
    },
  })
    .png()
    .toBuffer();

  console.log("Original metadata:");
  const orig = await sharp(image).metadata();
  console.log(JSON.stringify(orig, null, 2));

  const metadata = { prompt: "test", seed: 42 };
  const withMetadata = await embedMetadata(image, "png", metadata);

  console.log("\nWith metadata:");
  const after = await sharp(withMetadata).metadata();
  console.log(JSON.stringify(after, null, 2));
  console.log("\nXMP:", after.xmp?.toString());
}

debug();
