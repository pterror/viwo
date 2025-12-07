import App from "./App";
import { render } from "ink";

const useAltScreen = process.platform !== "win32";
if (useAltScreen) {
  process.stdout.write("\u001B[?1049h");
}
const { waitUntilExit } = render(<App />);
await waitUntilExit();
if (useAltScreen) {
  process.stdout.write("\u001B[?1049l");
}
