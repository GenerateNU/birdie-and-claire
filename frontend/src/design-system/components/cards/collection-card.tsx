import { AddTile } from "@/design-system/components/cards/add-tile";
import { CardImage } from "@/design-system/components/cards/card-image";
import {
  CardFooter,
  CardHoverOutline,
  CardOpenCover,
  CardWash,
} from "@/design-system/components/cards/card-parts";
import type { MenuProps } from "@/design-system/components/menu/menu";
import { Box } from "@/design-system/primitives/box";

type CollageSlotProps = {
  src: string | null;
  className: string;
};

function CollageSlot({ src, className }: CollageSlotProps) {
  return (
    <Box className={`relative bg-surface ${className}`}>
      <CardImage src={src} fit="contain" className="absolute inset-0 size-full" />
    </Box>
  );
}

type CollectionCardProps =
  | { type: "new"; onClick: () => void }
  | {
      type: "collection";
      title: string;
      count: string;
      description?: string;
      /** Up to three outfit images: the first fills the large slot, the next two the small ones. */
      images: string[];
      onOpen: () => void;
      menu?: MenuProps;
    };

/** One collection of outfits, shown as a collage. `new` is the tile that ends the grid. */
export function CollectionCard(props: CollectionCardProps) {
  if (props.type === "new") {
    return <AddTile size="collection" label="New collection" onClick={props.onClick} />;
  }

  const [main = null, top = null, bottom = null] = props.images;

  return (
    <Box className="group relative flex w-collection flex-col gap-sm text-primary">
      <Box className="relative flex h-collection gap-xxs">
        <CollageSlot src={main} className="w-collage-main shrink-0" />
        <Box className="flex flex-1 flex-col gap-xxs">
          <CollageSlot src={top} className="flex-1" />
          <CollageSlot src={bottom} className="flex-1" />
        </Box>
        <CardWash />
      </Box>
      <CardOpenCover label={props.title} onClick={props.onOpen} />
      <CardFooter menu={props.menu} className="gap-xs">
        <Box className="text-label-l-strong">{props.title}</Box>
        <Box className="text-body-s text-secondary">{props.count}</Box>
        {props.description && <Box className="text-body-s text-secondary">{props.description}</Box>}
      </CardFooter>
      <CardHoverOutline />
    </Box>
  );
}
