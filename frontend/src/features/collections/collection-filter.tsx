import { useQuery } from "@tanstack/react-query";

import { listCollectionsOptions } from "@/api/generated/@tanstack/react-query.gen";
import { FilterMenu } from "@/design-system";

type CollectionFilterProps = {
  /** The collection the list is filtered to, or undefined for all outfits. */
  collectionId: string | undefined;
  onCollectionIdChange: (collectionId: string | undefined) => void;
};

/** The Saved outfits Filter. It lists only the first page of collections, the newest ones. */
export function CollectionFilter({ collectionId, onCollectionIdChange }: CollectionFilterProps) {
  const collectionsQuery = useQuery(listCollectionsOptions());
  const collections = collectionsQuery.data?.items ?? [];

  return (
    <FilterMenu
      label="Filter"
      options={collections.map((collection) => ({
        value: collection.id,
        label: `${collection.name} (${collection.outfit_count})`,
      }))}
      value={collectionId ?? null}
      onValueChange={(value) => onCollectionIdChange(value ?? undefined)}
      disabled={collections.length === 0}
    />
  );
}
