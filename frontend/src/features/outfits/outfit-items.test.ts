import { describe, expect, test } from "bun:test";

import { placeOnCanvas, type Product } from "@/features/outfits/outfit-items";

function top(id: string, title: string): Product {
  return { id, title, slot: "top", image_url: `https://example.com/${id}.png` };
}

const blazer = top("blazer", "Blazer");

const tee = top("tee", "Tee");

describe("placeOnCanvas", () => {
  test("gives spots in the order given, not by title", () => {
    const teeFirst = placeOnCanvas([tee, blazer]);
    const blazerFirst = placeOnCanvas([blazer, tee]);

    expect(teeFirst.map((placement) => placement.product.id)).toEqual(["tee", "blazer"]);
    expect(teeFirst[0].spot).toBe(blazerFirst[0].spot);
    expect(teeFirst[1].spot).toBe(blazerFirst[1].spot);
    expect(teeFirst[0].spot).not.toBe(teeFirst[1].spot);
  });

  test("layers a top over a one-piece", () => {
    const dress: Product = {
      id: "dress",
      title: "Dress",
      slot: "one_piece",
      image_url: "https://example.com/dress.png",
    };

    const [blazerPlacement, dressPlacement] = placeOnCanvas([blazer, dress]);

    expect(dressPlacement.product.id).toBe("dress");
    expect(blazerPlacement.spot.layer).toBeGreaterThan(dressPlacement.spot.layer);
  });
});
