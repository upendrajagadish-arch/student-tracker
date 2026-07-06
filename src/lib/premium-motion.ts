"use client";

import { useEffect, useState } from "react";

/** Returns true when user prefers reduced motion (SSR-safe). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

/** CSS class helper — returns empty string when motion should be reduced. */
export function motionClass(
  reduced: boolean,
  animated: string,
  fallback = ""
): string {
  return reduced ? fallback : animated;
}
