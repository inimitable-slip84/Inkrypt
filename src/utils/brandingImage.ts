const MAX_FILE_BYTES = 512 * 1024;
const MAX_DATA_URL_CHARS = 220_000;

async function fileToScaledDataUrl(
  file: File,
  opts: { maxW: number; maxH: number; square: boolean }
): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`Image must be under ${Math.round(MAX_FILE_BYTES / 1024)} KB`);
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (PNG, JPEG, or WebP)');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { maxW, maxH, square } = opts;
    let canvasW: number;
    let canvasH: number;

    if (square) {
      canvasW = 128;
      canvasH = 128;
    } else {
      const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
      canvasW = Math.max(1, Math.round(bitmap.width * scale));
      canvasH = Math.max(1, Math.round(bitmap.height * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');

    if (square) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, 128, 128);
    } else {
      ctx.drawImage(bitmap, 0, 0, canvasW, canvasH);
    }

    let dataUrl = canvas.toDataURL('image/png');
    let guard = 0;
    while (dataUrl.length > MAX_DATA_URL_CHARS && guard < 10) {
      const factor = 0.88;
      const nw = Math.max(48, Math.round(canvasW * factor));
      const nh = Math.max(16, Math.round(canvasH * factor));
      const c2 = document.createElement('canvas');
      c2.width = nw;
      c2.height = nh;
      const c2x = c2.getContext('2d');
      if (!c2x) break;
      c2x.drawImage(canvas, 0, 0, nw, nh);
      canvas.width = nw;
      canvas.height = nh;
      canvas.getContext('2d')?.drawImage(c2, 0, 0);
      dataUrl = canvas.toDataURL('image/png');
      canvasW = nw;
      canvasH = nh;
      guard += 1;
    }

    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      throw new Error('Image is still too large — try a smaller file or simpler artwork');
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

export function processMainLogoFile(file: File): Promise<string> {
  return fileToScaledDataUrl(file, { maxW: 360, maxH: 96, square: false });
}

export function processToolbarIconFile(file: File): Promise<string> {
  return fileToScaledDataUrl(file, { maxW: 128, maxH: 128, square: true });
}
