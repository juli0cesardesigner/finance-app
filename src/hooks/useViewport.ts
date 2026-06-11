"use client";

import { useEffect, useState } from "react";

export function useViewport() {
  const [visibleHeight, setVisibleHeight] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleViewportChange() {
      if (window.visualViewport) {
        setVisibleHeight(window.visualViewport.height);
      }
    }

    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    // Ajusta o valor inicial
    if (window.visualViewport) {
      setVisibleHeight(window.visualViewport.height);
    } else {
      setVisibleHeight(window.innerHeight);
    }

    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return visibleHeight;
}
