"use client";

import { useEffect } from "react";

import { readRememberedPlace } from "@/components/RememberedPlace/RememberedPlace";

/** Pre-selects the state of the place remembered on this device, if none is chosen yet. */
export function UfDefault({ selectId }: { selectId: string }) {
  useEffect(() => {
    const select = document.getElementById(selectId);
    const place = readRememberedPlace();
    if (select instanceof HTMLSelectElement && !select.value && place) {
      select.value = place.codigo.slice(0, 2);
    }
  }, [selectId]);
  return null;
}
