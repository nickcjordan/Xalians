"use client"

import { AspectRatio as AspectRatioPrimitive } from "radix-ui"

/** A fixed-ratio box for plates and world art. Kept as shipped by shadcn. */
function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export { AspectRatio }
