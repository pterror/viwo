// oxlint-disable-next-line no-unassigned-import
import "@viwo/shared/index.css";
import App from "./App";
import { render } from "solid-js/web";

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

const root = document.querySelector("#root");

if (root) {
  render(() => <App />, root);
}
