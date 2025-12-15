import {
  compositeImages,
  convertImage,
  embedMetadata,
  filterImage,
  readMetadata,
  transformImage,
} from "./index";
import { describe, expect, test } from "bun:test";
import sharp from "sharp";

// Helper to create a test image
function createTestImage(
  width = 100,
  height = 100,
  format: "png" | "jpeg" | "webp" = "png",
): Promise<Buffer> {
  const pipeline = sharp({
    create: {
      background: { b: 0, g: 0, r: 255 },
      channels: 3,
      height,
      width,
    },
  });

  switch (format) {
    case "png": {
      return pipeline.png().toBuffer();
    }
    case "jpeg": {
      return pipeline.jpeg().toBuffer();
    }
    case "webp": {
      return pipeline.webp().toBuffer();
    }
  }
}

describe("metadata", () => {
  test("embedMetadata and readMetadata for PNG", async () => {
    const image = await createTestImage(100, 100, "png");
    const metadata = { prompt: "test image", seed: 42, steps: 20 };

    const withMetadata = await embedMetadata(image, "png", metadata);
    const extracted = await readMetadata(withMetadata);

    expect(extracted).toEqual(metadata);
  });

  test("embedMetadata and readMetadata for JPEG", async () => {
    const image = await createTestImage(100, 100, "jpeg");
    const metadata = { model: "sd1.5", prompt: "jpeg test" };

    const withMetadata = await embedMetadata(image, "jpeg", metadata);
    const extracted = await readMetadata(withMetadata);

    expect(extracted).toEqual(metadata);
  });

  test("embedMetadata and readMetadata for WebP", async () => {
    const image = await createTestImage(100, 100, "webp");
    const metadata = { cfg: 7.5, prompt: "webp test" };

    const withMetadata = await embedMetadata(image, "webp", metadata);
    const extracted = await readMetadata(withMetadata);

    expect(extracted).toEqual(metadata);
  });

  test("readMetadata returns null for image without metadata", async () => {
    const image = await createTestImage();
    const extracted = await readMetadata(image);

    expect(extracted).toBeNull();
  });
});

describe("convertImage", () => {
  test("convert PNG to JPEG", async () => {
    const png = await createTestImage(100, 100, "png");
    const jpeg = await convertImage(png, "jpeg");

    const info = await sharp(jpeg).metadata();
    expect(info.format).toBe("jpeg");
  });

  test("convert PNG to WebP", async () => {
    const png = await createTestImage(100, 100, "png");
    const webp = await convertImage(png, "webp");

    const info = await sharp(webp).metadata();
    expect(info.format).toBe("webp");
  });

  test("convert with metadata preservation", async () => {
    const image = await createTestImage(100, 100, "png");
    const metadata = { prompt: "conversion test", seed: 123 };
    const withMetadata = await embedMetadata(image, "png", metadata);

    const converted = await convertImage(withMetadata, "jpeg", {
      preserveMetadata: true,
    });

    const extracted = await readMetadata(converted);
    expect(extracted).toEqual(metadata);
  });

  test("convert with quality option", async () => {
    const image = await createTestImage(100, 100, "png");
    const jpeg = await convertImage(image, "jpeg", { quality: 50 });

    const info = await sharp(jpeg).metadata();
    expect(info.format).toBe("jpeg");
  });
});

describe("transformImage", () => {
  test("rotate image by 90 degrees", async () => {
    const image = await createTestImage(100, 50);
    const rotated = await transformImage(image, 90, 1);

    const info = await sharp(rotated).metadata();
    // After 90° rotation, width and height should swap
    expect(info.width).toBe(50);
    expect(info.height).toBe(100);
  });

  test("scale image by 2x", async () => {
    const image = await createTestImage(100, 100);
    const scaled = await transformImage(image, 0, 2);

    const info = await sharp(scaled).metadata();
    expect(info.width).toBe(200);
    expect(info.height).toBe(200);
  });

  test("scale image by 0.5x", async () => {
    const image = await createTestImage(100, 100);
    const scaled = await transformImage(image, 0, 0.5);

    const info = await sharp(scaled).metadata();
    expect(info.width).toBe(50);
    expect(info.height).toBe(50);
  });

  test("rotate and scale together", async () => {
    const image = await createTestImage(100, 50);
    const transformed = await transformImage(image, 90, 2);

    const info = await sharp(transformed).metadata();
    // After 90° rotation and 2x scale
    expect(info.width).toBe(100);
    expect(info.height).toBe(200);
  });

  test("no transformation when rotation=0 and scale=1", async () => {
    const image = await createTestImage(100, 100);
    const transformed = await transformImage(image, 0, 1);

    const info = await sharp(transformed).metadata();
    expect(info.width).toBe(100);
    expect(info.height).toBe(100);
  });
});

describe("filterImage", () => {
  test("apply blur filter", async () => {
    const image = await createTestImage();
    const blurred = await filterImage(image, "blur");

    const info = await sharp(blurred).metadata();
    expect(info.width).toBe(100);
    expect(info.height).toBe(100);
    // Verify it's a valid image
    expect(blurred).toBeInstanceOf(Buffer);
    expect(blurred.length).toBeGreaterThan(0);
  });

  test("apply sharpen filter", async () => {
    const image = await createTestImage();
    const sharpened = await filterImage(image, "sharpen");

    const info = await sharp(sharpened).metadata();
    expect(info.width).toBe(100);
    expect(info.height).toBe(100);
    expect(sharpened).toBeInstanceOf(Buffer);
    expect(sharpened.length).toBeGreaterThan(0);
  });

  test("apply grayscale filter", async () => {
    const image = await createTestImage();
    const grayscale = await filterImage(image, "grayscale");

    const info = await sharp(grayscale).metadata();
    expect(info.width).toBe(100);
    expect(info.height).toBe(100);
    // Grayscale images should have 1 channel (or 2 with alpha)
    expect(info.channels).toBeLessThanOrEqual(2);
  });
});

describe("compositeImages", () => {
  test("composite overlay onto base", async () => {
    const base = await createTestImage(200, 200);
    const overlay = await createTestImage(50, 50);

    const composited = await compositeImages(base, overlay, 25, 25);

    const info = await sharp(composited).metadata();
    expect(info.width).toBe(200);
    expect(info.height).toBe(200);
  });

  test("composite at different positions", async () => {
    const base = await createTestImage(200, 200);
    const overlay = await createTestImage(50, 50);

    const composited = await compositeImages(base, overlay, 100, 100);

    const info = await sharp(composited).metadata();
    expect(info.width).toBe(200);
    expect(info.height).toBe(200);
  });

  test("composite at origin (0, 0)", async () => {
    const base = await createTestImage(200, 200);
    const overlay = await createTestImage(50, 50);

    const composited = await compositeImages(base, overlay, 0, 0);

    const info = await sharp(composited).metadata();
    expect(info.width).toBe(200);
    expect(info.height).toBe(200);
  });
});
