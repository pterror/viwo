{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };
  outputs =
    { self, nixpkgs }:
    let
      forAllSystems =
        with nixpkgs.lib;
        f: foldAttrs mergeAttrs { } (map (s: { ${s} = f s; }) systems.flakeExposed);
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          # Default: TypeScript development only (fast)
          default = pkgs.mkShell {
            packages = with pkgs; [
              bun
              nodePackages.typescript
              nodePackages.typescript-language-server
              psmisc # for fuser
              ripgrep
            ];
          };

          # Full: TypeScript + Python for diffusers server
          full = pkgs.mkShell rec {
            packages = with pkgs; [
              bun
              nodePackages.typescript
              nodePackages.typescript-language-server
              psmisc
              ripgrep
              # Python for diffusers server
              stdenv.cc.cc
              python313
              uv
              ruff
            ];
            LD_LIBRARY_PATH = "${pkgs.lib.makeLibraryPath packages}:$LD_LIBRARY_PATH";
          };
        }
      );
    };
}
