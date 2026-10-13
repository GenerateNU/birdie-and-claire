import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { apiFetch } from "../../../api";
import panelHandleIcon from "../../../assets/icons/panel-handle.svg";
import redoIcon from "../../../assets/icons/redo.svg";
import undoIcon from "../../../assets/icons/undo.svg";
import logo from "../../../assets/logo.png";
import OutfitCanvas from "../../../OutfitCanvas";
import OutfitDetails from "../../../OutfitDetails";
import type { Outfit } from "../../../OutfitList";
import type { ItemImage, OutfitItem, Product } from "../../../outfitItems";

export const Route = createFileRoute("/_signedIn/_hasAccount/outfits/$outfitId")({
  component: OutfitPage,
});

type OutfitResponse = Outfit & {
  products: Product[];
};

type ProductImage = {
  url: string;
};

type EditorFrameProps = {
  children: ReactNode;
};

/** The outfit, or null when no outfit has this ID. */
async function fetchOutfit(outfitId: string, signal: AbortSignal): Promise<OutfitResponse | null> {
  const response = await apiFetch(`/api/v1/outfits/${encodeURIComponent(outfitId)}`, { signal });

  // huma answers 422 for an ID that isn't a UUID, which can't name an outfit either.
  if (response.status === 404 || response.status === 422) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function fetchProductImages(productId: string, signal: AbortSignal): Promise<ProductImage[]> {
  const response = await apiFetch(`/api/v1/products/${encodeURIComponent(productId)}/images`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/** The API orders a product's images by position, so the first is the one to show. */
function firstImage(query: UseQueryResult<ProductImage[]>): ItemImage {
  if (query.isPending) {
    return { status: "loading" };
  }

  // A failed background refetch keeps the last good data, so data is checked rather than the error.
  if (query.data === undefined) {
    return { status: "failed" };
  }

  if (query.data.length === 0) {
    return { status: "missing" };
  }

  return { status: "loaded", url: query.data[0].url };
}

function OutfitPage() {
  const { outfitId } = Route.useParams();

  const outfitQuery = useQuery({
    queryKey: ["outfit", outfitId],
    queryFn: ({ signal }) => fetchOutfit(outfitId, signal),
  });

  const products = outfitQuery.data?.products ?? [];

  const imageQueries = useQueries({
    queries: products.map((product) => ({
      queryKey: ["product-images", product.id],
      queryFn: ({ signal }) => fetchProductImages(product.id, signal),
    })),
  });

  if (outfitQuery.isPending) {
    return (
      <EditorFrame>
        <p className="p-[24px] text-[24px] leading-[32px]">Loading…</p>
      </EditorFrame>
    );
  }

  // Checked rather than isError, so a failed background refetch keeps the outfit on screen.
  if (outfitQuery.data === undefined) {
    return (
      <EditorFrame>
        <p className="p-[24px] text-[24px] leading-[32px]">
          Failed to load the outfit: {outfitQuery.error?.message}{" "}
          <button className="underline" onClick={() => void outfitQuery.refetch()}>
            Retry
          </button>
        </p>
      </EditorFrame>
    );
  }

  if (outfitQuery.data === null) {
    return (
      <EditorFrame>
        <p className="p-[24px] text-[24px] leading-[32px]">Outfit not found.</p>
      </EditorFrame>
    );
  }

  const items: OutfitItem[] = products.map((product, index) => ({
    product,
    image: firstImage(imageQueries[index]),
  }));

  return (
    <EditorFrame>
      {/* The handle column has no width, so the 4px gap on each side of it makes the Figma's 8px.
          The grow factors are the Figma's panel widths, so the panels keep that ratio at any page
          width. 912 is also CANVAS_SIZE.width. */}
      <main className="flex gap-[4px] p-[8px] pt-[16px]">
        <div className="min-w-0 grow-[912] basis-0">
          <OutfitCanvas items={items} />
        </div>
        {/* Panel resizing comes with outfit editing. Until then the handle is only drawn. */}
        <div className="relative z-10 w-0 self-center">
          <img
            src={panelHandleIcon}
            alt=""
            width={32}
            height={32}
            className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
          />
        </div>
        {/* Absolute, so a long list scrolls inside the panel instead of growing past the canvas. */}
        <div className="relative min-w-0 grow-[576] basis-0">
          <div className="absolute inset-0">
            <OutfitDetails outfitName={outfitQuery.data.name} items={items} />
          </div>
        </div>
      </main>
    </EditorFrame>
  );
}

function EditorFrame({ children }: EditorFrameProps) {
  return (
    <div className="min-h-screen bg-white font-roboto text-black">
      <div className="mx-auto max-w-[1512px]">
        <EditorHeader />
        {children}
      </div>
    </div>
  );
}

function EditorHeader() {
  return (
    <header className="grid h-[144px] grid-cols-[1fr_auto_1fr] items-end border border-black px-[18px]">
      <h1 className="pb-[18px] text-[28px] font-medium leading-[36px]">Outfit Editor</h1>
      <Link to="/outfits" className="pb-[2px]">
        {/* object-bottom repeats the Figma's crop of the image's empty top edge. */}
        <img
          src={logo}
          alt="Birdie & Claire"
          className="h-[118px] w-[373px] object-cover object-bottom"
        />
      </Link>
      {/* Editing isn't built yet. These hold the Figma's layout until it is. Both icon SVGs are
          drawn upside down, so rotate-180 turns each one back. */}
      <div className="flex items-center gap-[5px] justify-self-end pb-[12px]">
        <button
          type="button"
          disabled
          aria-label="Undo"
          className="disabled:cursor-not-allowed disabled:opacity-40"
        >
          <img src={undoIcon} alt="" width={40} height={40} className="rotate-180" />
        </button>
        <button
          type="button"
          disabled
          aria-label="Redo"
          className="disabled:cursor-not-allowed disabled:opacity-40"
        >
          <img src={redoIcon} alt="" width={40} height={40} className="rotate-180" />
        </button>
        <button
          type="button"
          disabled
          className="ml-[12px] h-[48px] rounded-[25px] border border-black bg-[rgba(128,128,128,0.55)] px-[24px] text-[28px] font-medium leading-[36px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </header>
  );
}
