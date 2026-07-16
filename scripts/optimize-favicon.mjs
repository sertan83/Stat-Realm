import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "app", "favicon.ico");
const OUTPUT_ICO = path.join(ROOT, "app", "favicon.ico");
const OUTPUT_PNG = path.join(ROOT, "public", "favicon-64.png");
const FILL_RATIO = 0.875;
const ALPHA_THRESHOLD = 8;
const ICO_SIZES = [16, 32, 48, 64];

async function findContentBounds(image) {
  const { data, info } = await image
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + (channels - 1)];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("Could not find visible logo content in favicon source.");
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function renderSquareIcon(source, size) {
  const bounds = await findContentBounds(source);
  const targetSize = Math.round(size * FILL_RATIO);

  const logo = source
    .clone()
    .extract(bounds)
    .resize(targetSize, targetSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    });

  const offset = Math.round((size - targetSize) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: await logo.png().toBuffer(), left: offset, top: offset }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(16 * images.length);
  let offset = 6 + 16 * images.length;
  const chunks = [header, entries];

  images.forEach(({ size, png }, index) => {
    const entryOffset = index * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    entries.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    entries.writeUInt8(0, entryOffset + 2);
    entries.writeUInt8(0, entryOffset + 3);
    entries.writeUInt16LE(1, entryOffset + 4);
    entries.writeUInt16LE(32, entryOffset + 6);
    entries.writeUInt32LE(png.length, entryOffset + 8);
    entries.writeUInt32LE(offset, entryOffset + 12);
    offset += png.length;
    chunks.push(png);
  });

  return Buffer.concat(chunks);
}

async function main() {
  const source = sharp(SOURCE, { animated: false });
  const metadata = await source.metadata();

  console.log("Source favicon metadata:", {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  });

  const bounds = await findContentBounds(source);
  console.log("Detected logo bounds:", bounds);

  const rendered = new Map(
    await Promise.all(
      ICO_SIZES.map(async (size) => [size, await renderSquareIcon(source, size)]),
    ),
  );

  const png64 = rendered.get(64);
  if (!png64) {
    throw new Error("Failed to render 64x64 favicon.");
  }

  await mkdir(path.dirname(OUTPUT_PNG), { recursive: true });
  await writeFile(OUTPUT_PNG, png64);
  await writeFile(
    OUTPUT_ICO,
    encodeIco(
      ICO_SIZES.map((size) => ({
        size,
        png: rendered.get(size),
      })).filter((entry) => entry.png),
    ),
  );

  console.log("Wrote optimized favicon:", OUTPUT_ICO);
  console.log("Wrote optimized png:", OUTPUT_PNG);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
