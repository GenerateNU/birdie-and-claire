import { CardImage } from "@/design-system/components/cards/card-image";
import {
  CardCheckBox,
  CardFooter,
  CardHoverOutline,
  CardOpenCover,
  CardSelectCover,
  CardSelectedRing,
  CardWash,
} from "@/design-system/components/cards/card-parts";
import type { MenuProps } from "@/design-system/components/menu/menu";
import { Box } from "@/design-system/primitives/box";

type OutfitCardProps = {
  title: string;
  /** The pieces in the outfit, cut off after two lines. */
  pieces?: string;
  /** The outfit as one image. */
  src: string | null;
} & (
  | { mode: "browse"; onOpen: () => void; menu?: MenuProps }
  /** `single` picks one outfit and shows only the ring; `multi` also shows a checkbox. */
  | {
      mode: "single" | "multi";
      selected: boolean;
      onSelectedChange: (selected: boolean) => void;
    }
);

/** One saved or suggested outfit. */
export function OutfitCard(props: OutfitCardProps) {
  const { title, pieces, src } = props;
  const selected = props.mode !== "browse" && props.selected;

  return (
    <Box className="group relative flex w-outfit flex-col gap-sm text-primary">
      <Box className="relative h-outfit w-full shrink-0 bg-surface">
        <CardImage src={src} fit="contain" className="size-full" />
        <CardWash />
        {selected && <CardSelectedRing />}
        {props.mode === "multi" && (
          <CardCheckBox
            checked={props.selected}
            iconSize={14}
            className="left-sm top-sm size-control border"
          />
        )}
      </Box>
      {props.mode === "browse" ? (
        <CardOpenCover label={title} onClick={props.onOpen} />
      ) : (
        <CardSelectCover
          label={title}
          pressed={props.selected}
          onPressedChange={props.onSelectedChange}
        />
      )}
      <CardFooter menu={props.mode === "browse" ? props.menu : undefined} className="gap-xxs">
        <Box className="text-label-l-strong">{title}</Box>
        {pieces && <Box className="line-clamp-2 text-body-s text-secondary">{pieces}</Box>}
      </CardFooter>
      <CardHoverOutline />
    </Box>
  );
}
