import { useWindowDimensions } from "react-native";

/** Share of screen width used for centered study/quiz columns. */
export const CONTENT_WIDTH_RATIO = 0.88;

/** Upper bound so cards and controls stay readable on wide screens. */
export const MAX_CONTENT_WIDTH = 640;

export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(Math.round(width * CONTENT_WIDTH_RATIO), MAX_CONTENT_WIDTH);
}
