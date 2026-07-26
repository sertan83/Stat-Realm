import { rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public", "statrealmlogo.png");
const OUTPUT_LOGO = path.join(ROOT, "public", "statrealmlogo.png");
const OUTPUT_LOGO_TEMP = path.join(ROOT, "public", ".statrealmlogo.tmp.png");
const OUTPUT_ICON = path.join(ROOT, "public", "statrealm-icon.png");
const OUTPUT_APP_ICON = path.join(ROOT, "app", "icon.png");

const BLACK_THRESHOLD = 28;

async function removeBlackBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    if (red <= BLACK_THRESHOLD && green <= BLACK_THRESHOLD && blue <= BLACK_THRESHOLD) {
      data[index + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png();
}

async function writeIconMark(source, outputPath) {
  const metadata = await source.metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const iconCropWidth = Math.min(width, Math.max(1, Math.round(width * 0.32)));

  await source
    .clone()
    .extract({
      left: 0,
      top: 0,
      width: iconCropWidth,
      height,
    })
    .trim()
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outputPath);
}

async function main() {
  const transparent = await removeBlackBackground(SOURCE);
  const trimmed = transparent.clone().trim();

  await trimmed.clone().toFile(OUTPUT_LOGO_TEMP);
  await rename(OUTPUT_LOGO_TEMP, OUTPUT_LOGO);

  const processedLogo = sharp(OUTPUT_LOGO);
  await writeIconMark(processedLogo, OUTPUT_ICON);
  await writeIconMark(processedLogo, OUTPUT_APP_ICON);

  console.log("Processed transparent logo assets.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
