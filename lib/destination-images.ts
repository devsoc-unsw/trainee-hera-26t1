import { getDestinationImagePublicUrl } from "@/lib/destination-storage";

export type LocationImageRow = {
  id: string;
  storage_path: string;
  sort_order: number;
};

export type DestinationImageView = LocationImageRow & {
  url: string;
};

export function toDestinationImageViews(
  rows: LocationImageRow[] | null | undefined,
): DestinationImageView[] {
  if (!rows?.length) return [];
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      ...row,
      url: getDestinationImagePublicUrl(row.storage_path),
    }));
}
