/** Where the garment sits in a photo, as fractions of the photo's width and height. */
export type GarmentBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** A product photo with the background around the garment made transparent. */
export type GarmentCutout = {
  /** PNG data URL, so there's no object URL to revoke. */
  url: string;
  garment: GarmentBox;
};

// Store photos are flat-lays on white. A pixel this light in every channel counts as background.
const NEAR_WHITE = 232;

// The cut-out's longest side, in pixels. Enough detail for the outfit canvas, and small enough to
// cut out quickly.
const MAX_SIDE = 600;

// ImageData holds one byte per channel, in RGBA order.
const BYTES_PER_PIXEL = 4;

const ALPHA_OFFSET = 3;

// A row or column needs this many garment pixels to count, so specks of shadow don't stretch the box.
const MIN_GARMENT_PIXELS = 3;

/**
 * Cuts a garment out of its photo and measures where it sits. Rejects when the photo can't be
 * loaded or read, for example when its host doesn't allow cross-origin reads.
 */
export async function cutOutGarment(photoUrl: string): Promise<GarmentCutout> {
  const photo = await loadPhoto(photoUrl);
  const scale = Math.min(1, MAX_SIDE / Math.max(photo.naturalWidth, photo.naturalHeight));
  const canvas = document.createElement("canvas");

  canvas.width = Math.round(photo.naturalWidth * scale);
  canvas.height = Math.round(photo.naturalHeight * scale);

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("cut out garment: no 2D canvas context");
  }

  context.drawImage(photo, 0, 0, canvas.width, canvas.height);

  // Throws a SecurityError when the host didn't allow the cross-origin read.
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

  clearBackground(pixels);
  context.putImageData(pixels, 0, 0);

  return { url: canvas.toDataURL("image/png"), garment: measureGarment(pixels) };
}

function loadPhoto(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const photo = new Image();

    // Without it the canvas is tainted and its pixels can't be read.
    photo.crossOrigin = "anonymous";
    photo.onload = () => resolve(photo);
    photo.onerror = () => reject(new Error(`cut out garment: couldn't load ${url}`));
    photo.src = url;
  });
}

function isBackground(data: Uint8ClampedArray, pixelIndex: number): boolean {
  const offset = pixelIndex * BYTES_PER_PIXEL;

  // Already transparent counts too, so photos that are cut out already pass straight through.
  if (data[offset + ALPHA_OFFSET] === 0) {
    return true;
  }

  return (
    data[offset] > NEAR_WHITE && data[offset + 1] > NEAR_WHITE && data[offset + 2] > NEAR_WHITE
  );
}

/** Clears background reachable from the photo's edge, so white inside the garment stays. */
function clearBackground({ data, width, height }: ImageData) {
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x);
  }

  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1);
  }

  for (let pixelIndex = stack.pop(); pixelIndex !== undefined; pixelIndex = stack.pop()) {
    if (visited[pixelIndex] || !isBackground(data, pixelIndex)) {
      continue;
    }

    visited[pixelIndex] = 1;
    data[pixelIndex * BYTES_PER_PIXEL + ALPHA_OFFSET] = 0;

    const x = pixelIndex % width;

    if (x > 0) {
      stack.push(pixelIndex - 1);
    }

    if (x < width - 1) {
      stack.push(pixelIndex + 1);
    }

    if (pixelIndex >= width) {
      stack.push(pixelIndex - width);
    }

    if (pixelIndex < width * (height - 1)) {
      stack.push(pixelIndex + width);
    }
  }
}

function measureGarment({ data, width, height }: ImageData): GarmentBox {
  const columnCounts = new Uint32Array(width);
  const rowCounts = new Uint32Array(height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * BYTES_PER_PIXEL + ALPHA_OFFSET] > 0) {
        columnCounts[x]++;
        rowCounts[y]++;
      }
    }
  }

  const [left, right] = garmentSpan(columnCounts);
  const [top, bottom] = garmentSpan(rowCounts);

  return { left: left / width, top: top / height, right: right / width, bottom: bottom / height };
}

/** The first index with enough garment pixels, and one past the last. */
function garmentSpan(counts: Uint32Array): [number, number] {
  const first = counts.findIndex((count) => count >= MIN_GARMENT_PIXELS);

  if (first === -1) {
    throw new Error("cut out garment: the photo is all background");
  }

  let last = counts.length - 1;

  while (counts[last] < MIN_GARMENT_PIXELS) {
    last--;
  }

  return [first, last + 1];
}
