import { registerStringLibrary } from "./string";
import { registerListLibrary } from "./list";

export function registerStandardLibraries() {
  registerStringLibrary();
  registerListLibrary();
}
