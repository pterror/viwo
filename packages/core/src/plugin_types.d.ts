declare global {
  namespace ai {
    function text(prompt: string, system?: string): string;
    function json(prompt: string): object;
  }
}

export {};
