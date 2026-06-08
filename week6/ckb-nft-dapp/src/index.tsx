// src/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { LayoutProvider } from "./layoutProvider";

function App() {
  return <h1>🔗 Step 2: CCC Core Active (No Connector)</h1>;
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <LayoutProvider>
        <App />
      </LayoutProvider>
    </React.StrictMode>,
  );
}
