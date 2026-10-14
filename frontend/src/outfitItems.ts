/** A product from GET /api/v1/outfits/{id}, with the fields the outfit page reads. */
export type Product = {
  id: string;
  title: string;
  slot: ProductSlot;
};

/** Where a product's first image is, from GET /api/v1/products/{id}/images. */
export type ItemImage =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "missing" }
  | { status: "loaded"; url: string };

export type OutfitItem = {
  product: Product;
  image: ItemImage;
};

/**
 * The outfit canvas's size in pixels, from the Figma's Builder Space frame:
 * https://www.figma.com/design/oPKUetZyR06nTL9jjhj2Yy/%F0%9F%8E%A8-Birdie-and-Claire-Design?node-id=5229-1720
 * Spot positions are relative to it. On the page the canvas sits centered in a gray panel that can
 * be larger.
 */
export const CANVAS_SIZE = { width: 912, height: 808 };

/**
 * Where a garment goes on the canvas, in canvas pixels. The garment is scaled to garmentWidth,
 * centered on centerX, and its top or bottom edge lands on anchor.y. Its height follows the photo.
 */
export type CanvasSpot = {
  centerX: number;
  anchor: { edge: "top" | "bottom"; y: number };
  garmentWidth: number;
  /** Stacking order, following the Figma's. Higher draws on top. */
  layer: number;
};

export type ProductSlot = "top" | "bottom" | "accessory" | "shoe";

// Measured from silhouette.png as drawn on the canvas: centered on x 466, head y 46-150 and about
// 95px wide, shoulders at y 171, hips at y 408-436, feet at y 743. Robiya may tune these.
const TOP: CanvasSpot = {
  centerX: 466,
  anchor: { edge: "top", y: 146 },
  garmentWidth: 196,
  layer: 4,
};

// Left of the body, for a second top such as a jacket or sweater.
const TOP_BESIDE: CanvasSpot = {
  centerX: 236,
  anchor: { edge: "top", y: 47 },
  garmentWidth: 190,
  layer: 8,
};

// The waistband starts above the top's hem, so the top covers it.
const BOTTOM: CanvasSpot = {
  centerX: 466,
  anchor: { edge: "top", y: 345 },
  garmentWidth: 118,
  layer: 2,
};

const SHOE: CanvasSpot = {
  centerX: 464,
  anchor: { edge: "bottom", y: 748 },
  garmentWidth: 80,
  layer: 3,
};

// Slots don't say where on the body an accessory goes, so accessories stack in a column right of it.
const ACCESSORIES: CanvasSpot[] = [60, 300, 540].map((y) => ({
  centerX: 696,
  anchor: { edge: "top", y },
  garmentWidth: 110,
  layer: 1,
}));

// Each slot lists the spots it can take, in the order it tries them.
const SPOTS_BY_SLOT: Record<ProductSlot, CanvasSpot[]> = {
  top: [TOP, TOP_BESIDE],
  bottom: [BOTTOM],
  shoe: [SHOE],
  accessory: ACCESSORIES,
};

/** Head to toe, the order of the details list. */
export const SLOTS_HEAD_TO_TOE: ProductSlot[] = ["top", "bottom", "shoe", "accessory"];

/**
 * Gives each item with a photo the first free spot its slot can take, in title order. An item
 * whose photo is still loading keeps its spot, so the result doesn't change with load timing.
 * Items left without a spot show only in the details list.
 */
export function placeOnCanvas(items: OutfitItem[]): { item: OutfitItem; spot: CanvasSpot }[] {
  const takenSpots = new Set<CanvasSpot>();
  const placements = [];
  const byTitle = [...items].sort((a, b) => a.product.title.localeCompare(b.product.title));

  for (const item of byTitle) {
    if (item.image.status === "missing" || item.image.status === "failed") {
      continue;
    }

    const spot = SPOTS_BY_SLOT[item.product.slot].find((candidate) => !takenSpots.has(candidate));

    if (spot === undefined) {
      continue;
    }

    takenSpots.add(spot);
    placements.push({ item, spot });
  }

  return placements;
}
