declare global {
  namespace ai {
    function text(modelSpec: string, prompt: string, system?: string): string;
    function json(modelSpec: string, prompt: string): object;
  }
}

// oxlint-disable-next-line require-module-specifiers
export {};
