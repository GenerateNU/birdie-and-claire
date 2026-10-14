/** A product from GET /api/v1/outfits/{id}, with the fields the outfit page reads. */
export type Product = {
  id: string;
  title: string;
  product_type: string | null;
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

// Measured from silhouette.png as drawn on the canvas: centered on x 466, head y 46-150 and about
// 95px wide, shoulders at y 171, hands and hips at y 408-436, feet at y 743. Robiya may tune these.
const HAT: CanvasSpot = {
  centerX: 466,
  anchor: { edge: "bottom", y: 108 },
  garmentWidth: 92,
  layer: 7,
};

// The Figma has no scarf. It hangs from the neck, over the top and the belt.
const SCARF: CanvasSpot = {
  centerX: 466,
  anchor: { edge: "top", y: 150 },
  garmentWidth: 120,
  layer: 6,
};

// Left of the body. Outerwear is never worn on the canvas.
const JACKET: CanvasSpot = {
  centerX: 236,
  anchor: { edge: "top", y: 47 },
  garmentWidth: 190,
  layer: 8,
};

// JACKET mirrored to the right of the body (x 466), for a sweater when a top is already worn.
const SWEATER_BESIDE: CanvasSpot = {
  centerX: 696,
  anchor: { edge: "top", y: 47 },
  garmentWidth: 190,
  layer: 8,
};

const TOP: CanvasSpot = {
  centerX: 466,
  anchor: { edge: "top", y: 146 },
  garmentWidth: 196,
  layer: 4,
};

const BELT: CanvasSpot = {
  centerX: 466,
  anchor: { edge: "top", y: 335 },
  garmentWidth: 130,
  layer: 5,
};

const BAG: CanvasSpot = {
  centerX: 352,
  anchor: { edge: "top", y: 392 },
  garmentWidth: 92,
  layer: 1,
};

// The waistband starts above the top's hem, so the top covers it.
const BOTTOMS: CanvasSpot = {
  centerX: 466,
  anchor: { edge: "top", y: 345 },
  garmentWidth: 118,
  layer: 2,
};

const SHOES: CanvasSpot = {
  centerX: 464,
  anchor: { edge: "bottom", y: 748 },
  garmentWidth: 80,
  layer: 3,
};

/** Head to toe, the order of the details list. Sweaters are listed with tops wherever they're drawn. */
export const SPOTS_HEAD_TO_TOE = [HAT, SCARF, JACKET, TOP, BELT, BAG, BOTTOMS, SHOES];

// Provisional until the store's product types are filled in. Sweaters, Bags, and Scarf are values
// birdieandclaire.com already uses; the rest are guesses. Edit this table when they change.
// Each type lists the spots it can take, in the order it tries them.
const SPOTS_BY_PRODUCT_TYPE = new Map<string, CanvasSpot[]>([
  ["Hats", [HAT]],
  ["Scarf", [SCARF]],
  ["Outerwear", [JACKET]],
  ["Sweaters", [TOP, SWEATER_BESIDE]],
  ["Tops", [TOP]],
  ["Belts", [BELT]],
  ["Bags", [BAG]],
  ["Skirts", [BOTTOMS]],
  ["Pants", [BOTTOMS]],
  ["Shoes", [SHOES]],
]);

// Dressing order: a top is worn before a sweater, so a sweater only gets the body when there's no
// top. Other types never compete for the same spot, so they have no rank.
const INSIDE_OUT = ["Tops", "Sweaters"];

function spotsFor(productType: string | null): CanvasSpot[] {
  if (productType === null) {
    return [];
  }

  return SPOTS_BY_PRODUCT_TYPE.get(productType) ?? [];
}

/** The spot a product type is listed under, or undefined when it has none on the canvas. */
export function spotFor(productType: string | null): CanvasSpot | undefined {
  return spotsFor(productType)[0];
}

function placementOrder(a: OutfitItem, b: OutfitItem): number {
  const rankDifference =
    INSIDE_OUT.indexOf(a.product.product_type ?? "") -
    INSIDE_OUT.indexOf(b.product.product_type ?? "");

  if (rankDifference !== 0) {
    return rankDifference;
  }

  return a.product.title.localeCompare(b.product.title);
}

/**
 * Gives each item with a photo the first free spot its type can take, from the inside out and
 * then by title. An item whose photo is still loading keeps its spot, so the result doesn't
 * change with load timing. Items left without a spot show only in the details list.
 */
export function placeOnCanvas(items: OutfitItem[]): { item: OutfitItem; spot: CanvasSpot }[] {
  const takenSpots = new Set<CanvasSpot>();
  const placements = [];

  for (const item of [...items].sort(placementOrder)) {
    if (item.image.status === "missing" || item.image.status === "failed") {
      continue;
    }

    const spot = spotsFor(item.product.product_type).find(
      (candidate) => !takenSpots.has(candidate),
    );

    if (spot === undefined) {
      continue;
    }

    takenSpots.add(spot);
    placements.push({ item, spot });
  }

  return placements;
}
