import React from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";

(window as any).EXCALIDRAW_ASSET_PATH = "./excalidraw-dist-prod/";

(function attach() {
  (window as any).renderExcalidraw = function renderExcalidraw() {
    const mount = document.getElementById("app");
    if (!mount) return console.error("Missing #app container");

    const App = () =>
      React.createElement(
        "div",
        { style: { height: "100%", width: "100%" } },
        React.createElement(Excalidraw, null)
      );

    const root = createRoot(mount);
    root.render(React.createElement(App));
  };
})();