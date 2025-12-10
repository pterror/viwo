import { SysMint, hydrateCapability } from "../packages/core/src/runtime/capabilities";

console.log("Checking capability classes...");

// 1. SysMint
try {
  const mintCap = hydrateCapability({
    id: "mint-cap",
    ownerId: 0,
    params: { namespace: "test" },
    type: "sys.mint",
  }) as unknown as SysMint;

  if (mintCap instanceof SysMint) {
    console.log("SysMint hydrated correctly");
  } else {
    console.error("SysMint hydration failed", mintCap);
  }

  if (typeof mintCap.mint === "function") {
    console.log("SysMint.mint is a function");
  } else {
    console.error("SysMint.mint is missing");
  }
} catch (error) {
  console.error("SysMint test failed", error);
}

console.log("Finished checks.");
