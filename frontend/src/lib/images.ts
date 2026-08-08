/**
 * Menu photos are stored at 640px with a matching 320px variant beside them
 * (`espresso.webp` / `espresso@320.webp`). On a phone the grid is two columns,
 * so each card is roughly 170px wide and the 640px file is four times more
 * data than the screen can use.
 *
 * Returns srcSet/sizes props for an <img>, letting the browser pick. Images
 * that have no @320 sibling (an admin upload, or a remote URL) get nothing
 * back, so the plain src is used unchanged.
 */
export function srcSetFor(
  src: string | undefined | null,
): { srcSet?: string; sizes?: string } {
  if (!src || !src.startsWith("/static/uploads/") || !src.endsWith(".webp")) {
    return {};
  }
  const small = src.replace(/\.webp$/, "@320.webp");
  return {
    srcSet: `${small} 320w, ${src} 640w`,
    // two columns under 640px, three up to 1024px, four beyond
    sizes: "(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 22vw",
  };
}
