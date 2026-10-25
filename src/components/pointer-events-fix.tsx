"use client";

import * as React from "react";

function unlockPageInteraction() {
  if (typeof document === "undefined") return;

  const hasOpenModal = document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]'
  );

  if (!hasOpenModal) {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
    if (document.body.style.overflow === "hidden") {
      document.body.style.overflow = "";
    }
    if (document.body.hasAttribute("data-scroll-locked")) {
      document.body.removeAttribute("data-scroll-locked");
    }

    // Also ensure top-level app containers are not stuck with aria-hidden or inert or pointer-events: none
    const children = document.body.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      if (!el.hasAttribute("data-radix-portal")) {
        if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("data-aria-hidden")) {
          el.removeAttribute("aria-hidden");
          el.removeAttribute("data-aria-hidden");
        }
        if (el.hasAttribute("inert")) {
          el.removeAttribute("inert");
        }
        if (el.style && el.style.pointerEvents === "none") {
          el.style.pointerEvents = "";
        }
      }
    }
  }
}

export function PointerEventsFix() {
  React.useEffect(() => {
    const scheduleUnlock = () => {
      unlockPageInteraction();
      setTimeout(unlockPageInteraction, 50);
      setTimeout(unlockPageInteraction, 150);
      setTimeout(unlockPageInteraction, 260);
    };

    const observer = new MutationObserver(() => {
      scheduleUnlock();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked", "class"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
