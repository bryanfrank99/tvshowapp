import fs from "node:fs";
import path from "node:path";

export function generateIcon(pngPath = "resources/icon.png", icoPath = "resources/icon.ico") {
  const resolvedPng = path.resolve(pngPath);
  const resolvedIco = path.resolve(icoPath);

  if (!fs.existsSync(resolvedPng)) {
    throw new Error(`PNG icon not found at: ${resolvedPng}`);
  }

  const png = fs.readFileSync(resolvedPng);

  // Standard Windows ICO header with embedded PNG payload (Vista / Win 7 / 8 / 10 / 11)
  const ico = Buffer.alloc(22 + png.length);
  ico.writeUInt16LE(0, 0); // Reserved (must be 0)
  ico.writeUInt16LE(1, 2); // Resource type: 1 = Icon (.ICO)
  ico.writeUInt16LE(1, 4); // Number of images in directory: 1

  // Directory entry (16 bytes)
  ico.writeUInt8(0, 6); // Width: 0 represents 256px
  ico.writeUInt8(0, 7); // Height: 0 represents 256px
  ico.writeUInt8(0, 8); // Color count: 0 (No palette)
  ico.writeUInt8(0, 9); // Reserved (must be 0)
  ico.writeUInt16LE(1, 10); // Color planes: 1
  ico.writeUInt16LE(32, 12); // Bits per pixel: 32 (RGBA)
  ico.writeUInt32LE(png.length, 14); // Image data size in bytes
  ico.writeUInt32LE(22, 18); // Byte offset to image data

  // Copy PNG binary data right after the directory
  png.copy(ico, 22);

  fs.mkdirSync(path.dirname(resolvedIco), { recursive: true });
  fs.writeFileSync(resolvedIco, ico);
  console.log(`[Icon] Generated ${resolvedIco} (${(ico.length / 1024).toFixed(1)} KB)`);
  return resolvedIco;
}

// Execute directly if run via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/generate-icon.mjs")) {
  generateIcon();
}
