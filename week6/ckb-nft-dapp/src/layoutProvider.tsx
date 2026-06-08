// src/layoutProvider.tsx
import React from "react";

// For now, just a pass-through provider
// We'll add wallet context in Step 3
export function LayoutProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
