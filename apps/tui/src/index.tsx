import { render } from "ink";
import App from "./App";

const useAltScreen = process.platform !== "win32";
if (useAltScreen) {
  process.stdout.write("\x1b[?1049h");
}
const { waitUntilExit } = render(<App />);
await waitUntilExit();
if (useAltScreen) {
  process.stdout.write("\x1b[?1049l");
}
