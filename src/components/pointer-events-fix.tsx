"use client";

import * as React from "react";

export function PointerEventsFix() {
  React.useEffect(() => {
    const handlePointerFix = () => {
      const hasOpenDialog = document.querySelector('[role="dialog"], [data-state="open"]');
      if (!hasOpenDialog && document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
    const observer = new MutationObserver(handlePointerFix);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
