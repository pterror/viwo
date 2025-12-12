# Diffusers Plugin

Stable Diffusion image generation for viwo via capability-based access control.

## Overview

This plugin provides text-to-image generation using Huggingface Diffusers through a capability-based system. The plugin consists of two components:

1. **Python Server** (`server/`): FastAPI server that runs diffusion models
2. **TypeScript Plugin** (`src/`): viwo capability that interfaces with the server

## Architecture

```
┌─────────────┐          ┌──────────────────┐          ┌─────────────────┐
│   viwo      │  HTTP    │  DiffusersGenerate│  JSON    │  Python Server  │
│   Script    │─────────▶│  Capability       │─────────▶│  (FastAPI)      │
│             │          │  (checks params)  │          │  + diffusers    │
└─────────────┘          └──────────────────┘          └─────────────────┘
```

## Setup

### 1. Start the Python Server

The server requires Python 3.13, PyTorch, and Diffusers.

#### Using Nix (recommended):

```bash
cd plugins/diffusers/server
nix develop
uv sync
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

#### Without Nix:

```bash
cd plugins/diffusers/server
pip install uv
uv sync
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

The server will start on `http://localhost:8000`. Visit `/docs` for the interactive API documentation.

### 2. Load the Plugin in viwo

Add the plugin to your viwo configuration to register the capability type.

## Usage

### Create a Capability

First, mint a `diffusers.generate` capability with appropriate parameters:

```typescript
// Basic capability with a default model
let genCap = sys.mint.mint("diffusers.generate", {
  server_url: "http://localhost:8000",
  default_model: "stabilityai/stable-diffusion-2-1",
});
```

### Restrict Models (Optional)

Limit which models can be used by specifying an allowlist:

```typescript
let restrictedCap = sys.mint.mint("diffusers.generate", {
  server_url: "http://localhost:8000",
  default_model: "stabilityai/sdxl-turbo",
  allowed_models: ["stabilityai/sdxl-turbo", "stabilityai/stable-diffusion-2-1"],
});
```

### Generate Images

```typescript
// Simple generation with defaults
let result = genCap.textToImage("a beautiful sunset over mountains");

// With custom parameters
let customResult = genCap.textToImage("a futuristic cityscape at night", {
  width: 768,
  height: 512,
  numInferenceSteps: 30,
  guidanceScale: 7.5,
  negativePrompt: "blurry, low quality",
  seed: 42,
});

// Override the model
let xlResult = genCap.textToImage("detailed portrait", {
  modelId: "stabilityai/stable-diffusion-xl-base-1.0",
  width: 1024,
  height: 1024,
});

// Result contains: { image: base64string, width: number, height: number, format: "png" }
```

## Capability Parameters

- **`server_url`** (required): URL to the Python server (e.g., `"http://localhost:8000"`)
- **`default_model`** (required): Default model ID to use when not specified in request
- **`allowed_models`** (optional): Array of model IDs this capability can use. If not set, any model can be used.

## Resource Control

The capability system provides natural resource limiting:

- **Model restrictions**: Use `allowed_models` to limit which models can be accessed
- **Access control**: Only entities that own the capability can use it
- **Delegation**: Capabilities can be delegated with stricter restrictions
- **Future**: Add `max_concurrent` to limit simultaneous requests per capability

## Supported Models

The server auto-detects pipeline type based on model ID:

- **Stable Diffusion 1.5**: e.g., `runwayml/stable-diffusion-v1-5`, `stabilityai/stable-diffusion-2-1`
- **Stable Diffusion XL**: e.g., `stabilityai/stable-diffusion-xl-base-1.0`, `stabilityai/sdxl-turbo`
- **Stable Diffusion 3**: e.g., `stabilityai/stable-diffusion-3-medium`
- **Flux**: e.g., `black-forest-labs/FLUX.1-schnell`

Model files will be automatically downloaded from Huggingface Hub on first use and cached locally.

## Requirements

### Python Server

- Python 3.13
- CUDA-capable GPU (recommended, though CPU inference works)
- ~10GB disk space for model weights
- Dependencies managed via `uv` (see `pyproject.toml`)

### TypeScript Plugin

- Part of viwo workspace, dependencies managed via workspace

## Troubleshooting

### Server won't start

- Ensure Python 3.13 is installed: `python --version`
- Check if port 8000 is available: `lsof -i :8000`
- Verify dependencies: `uv sync`

### Out of memory errors

- Reduce image dimensions (try 512x512)
- Use a smaller model (e.g., `sdxl-turbo` instead of full SDXL)
- Close other GPU applications
- For CPU: reduce `num_inference_steps`

### Model download fails

- Check internet connection
- Verify Hugging Face Hub is accessible
- Some models may require authentication - set `HF_TOKEN` environment variable

### Image generation is slow

- First generation loads the model (slow)
- Subsequent generations reuse cached pipeline (faster)
- GPU greatly improves speed vs CPU
- Use turbo models for faster iteration: `stabilityai/sdxl-turbo`

## Development

### Type Checking

```bash
bun check:types
```

### Linting

```bash
bun lint
```

### Format

```bash
bun format
```
