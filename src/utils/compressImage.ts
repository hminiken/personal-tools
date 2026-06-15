import sharp from "sharp";

// ------------------------------------------------------------------
// IMAGE COMPRESSION
// Shrinks big uploads (e.g. 4MB phone photos) down to ~1MB before
// they ever hit the disk. Caps the longest edge and re-encodes as
// WebP, stepping quality down until the result fits the target.
// Server-only: pulls in the native `sharp` binary, so only import
// this from server actions / route handlers.
// ------------------------------------------------------------------
const MAX_DIMENSION = 2000;          // longest edge in px
const TARGET_BYTES = 1024 * 1024;    // ~1MB
const QUALITY_STEPS = [80, 70, 60, 50, 40];

export async function compressImage(input: Buffer): Promise<Buffer> {
  // .rotate() bakes in EXIF orientation so phone photos aren't sideways.
  const pipeline = sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });

  let output = await pipeline.clone().webp({ quality: QUALITY_STEPS[0] }).toBuffer();

  for (const quality of QUALITY_STEPS.slice(1)) {
    if (output.length <= TARGET_BYTES) break;
    output = await pipeline.clone().webp({ quality }).toBuffer();
  }

  return output;
}
