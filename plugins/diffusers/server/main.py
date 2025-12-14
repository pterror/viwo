"""
Stable Diffusion image generation server for viwo.

FastAPI server that provides text-to-image generation endpoints using Huggingface Diffusers.
"""

from contextlib import asynccontextmanager
from typing import Any

import torch
from diffusers import (
    DiffusionPipeline,
    FluxPipeline,
    StableDiffusion3Pipeline,
    StableDiffusionPipeline,
    StableDiffusionXLPipeline,
)
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel
import base64
from io import BytesIO

from controlnet import ControlNetManager
from inpaint import InpaintManager
from upscale import UpscaleManager


# Pipeline cache to avoid reloading models
pipeline_cache: dict[str, DiffusionPipeline] = {}

# Feature managers
controlnet_manager = ControlNetManager()
inpaint_manager = InpaintManager()
upscale_manager = UpscaleManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage pipeline cache lifecycle."""
    yield
    # Clean up pipelines on shutdown
    pipeline_cache.clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


app = FastAPI(
    title="viwo Diffusers Server",
    description="Stable Diffusion image generation for viwo",
    version="0.1.0",
    lifespan=lifespan,
)


class TextToImageRequest(BaseModel):
    """Request model for text-to-image generation."""

    model_id: str
    prompt: str
    width: int | None = None
    height: int | None = None
    num_inference_steps: int = 50
    guidance_scale: float = 7.5
    negative_prompt: str | None = None
    seed: int | None = None


class ImageResponse(BaseModel):
    """Response model containing generated image."""

    image: str  # base64 encoded
    width: int
    height: int
    format: str = "png"


def load_pipeline(model_id: str) -> DiffusionPipeline:
    """Load or retrieve cached pipeline for the given model."""
    if model_id in pipeline_cache:
        return pipeline_cache[model_id]

    print(f"Loading model: {model_id}")

    # Auto-detect pipeline type from model_id
    # This is a simplified approach - proper detection would check model config
    if "flux" in model_id.lower():
        pipeline = FluxPipeline.from_pretrained(
            model_id, torch_dtype=torch.float16
        )
    elif "sd3" in model_id.lower() or "stable-diffusion-3" in model_id.lower():
        pipeline = StableDiffusion3Pipeline.from_pretrained(
            model_id, torch_dtype=torch.float16
        )
    elif "xl" in model_id.lower():
        pipeline = StableDiffusionXLPipeline.from_pretrained(
            model_id, torch_dtype=torch.float16
        )
    else:
        # Default to SD 1.5 pipeline
        pipeline = StableDiffusionPipeline.from_pretrained(
            model_id, torch_dtype=torch.float16
        )

    if torch.cuda.is_available():
        pipeline = pipeline.to("cuda")

    pipeline_cache[model_id] = pipeline
    return pipeline


def image_to_base64(img: Image.Image) -> str:
    """Convert PIL Image to base64 string."""
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def base64_to_image(b64: str) -> Image.Image:
    """Convert base64 string to PIL Image."""
    image_bytes = base64.b64decode(b64)
    return Image.open(BytesIO(image_bytes))


class ControlNetPreprocessRequest(BaseModel):
    """Request model for ControlNet preprocessing."""

    image: str  # base64 encoded
    type: str  # control type (canny, depth, etc.)


class ControlNetGenerateRequest(BaseModel):
    """Request model for ControlNet generation."""

    prompt: str
    control_image: str  # base64 encoded
    type: str  # control type
    model_id: str = "runwayml/stable-diffusion-v1-5"
    strength: float = 1.0
    width: int | None = None
    height: int | None = None
    num_inference_steps: int = 50
    guidance_scale: float = 7.5
    negative_prompt: str | None = None
    seed: int | None = None


class ControlTypesResponse(BaseModel):
    """Response model for available control types."""

    types: list[dict[str, str]]


class InpaintRequest(BaseModel):
    """Request model for inpainting."""

    image: str  # base64 encoded
    mask: str  # base64 encoded, white = inpaint
    prompt: str
    model_id: str = "runwayml/stable-diffusion-inpainting"
    strength: float = 0.8
    width: int | None = None
    height: int | None = None
    num_inference_steps: int = 50
    guidance_scale: float = 7.5
    negative_prompt: str | None = None
    seed: int | None = None


class OutpaintRequest(BaseModel):
    """Request model for outpainting."""

    image: str  # base64 encoded
    direction: str  # "left", "right", "top", or "bottom"
    pixels: int
    prompt: str
    model_id: str = "runwayml/stable-diffusion-inpainting"
    strength: float = 0.8
    num_inference_steps: int = 50
    guidance_scale: float = 7.5
    negative_prompt: str | None = None
    seed: int | None = None


class UpscaleRequest(BaseModel):
    """Request model for upscaling."""

    image: str  # base64 encoded
    model: str = "realesrgan"  # "esrgan" or "realesrgan"
    factor: int = 2  # 2 or 4


class FaceRestoreRequest(BaseModel):
    """Request model for face restoration."""

    image: str  # base64 encoded
    strength: float = 1.0


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "device": "cuda" if torch.cuda.is_available() else "cpu"}


@app.get("/controlnet/types", response_model=ControlTypesResponse)
async def get_controlnet_types() -> ControlTypesResponse:
    """
    Get available ControlNet types with metadata.

    Returns:
        ControlTypesResponse with list of control types
    """
    types = controlnet_manager.get_available_types()
    return ControlTypesResponse(types=types)


@app.post("/controlnet/preprocess", response_model=ImageResponse)
async def controlnet_preprocess(req: ControlNetPreprocessRequest) -> ImageResponse:
    """
    Preprocess an image for ControlNet.

    Args:
        req: Request containing base64 image and control type

    Returns:
        ImageResponse with preprocessed control image

    Raises:
        HTTPException: If preprocessing fails
    """
    try:
        # Decode input image
        input_image = base64_to_image(req.image)

        # Preprocess
        control_image = controlnet_manager.preprocess(input_image, req.type)

        # Convert to base64
        image_b64 = image_to_base64(control_image)

        return ImageResponse(
            image=image_b64,
            width=control_image.width,
            height=control_image.height,
            format="png",
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=f"Invalid control type: {error!s}") from error
    except Exception as error:
        raise HTTPException(
            status_code=500, detail=f"Preprocessing failed: {error!s}"
        ) from error


@app.post("/controlnet/generate", response_model=ImageResponse)
async def controlnet_generate(req: ControlNetGenerateRequest) -> ImageResponse:
    """
    Generate an image with ControlNet guidance.

    Args:
        req: Request containing prompt, control image, and parameters

    Returns:
        ImageResponse with generated image

    Raises:
        HTTPException: If generation fails
    """
    try:
        # Decode control image
        control_image = base64_to_image(req.control_image)

        # Generate
        result_image = controlnet_manager.generate(
            prompt=req.prompt,
            control_image=control_image,
            control_type=req.type,
            base_model=req.model_id,
            strength=req.strength,
            width=req.width,
            height=req.height,
            num_inference_steps=req.num_inference_steps,
            guidance_scale=req.guidance_scale,
            negative_prompt=req.negative_prompt,
            seed=req.seed,
        )

        # Convert to base64
        image_b64 = image_to_base64(result_image)

        return ImageResponse(
            image=image_b64,
            width=result_image.width,
            height=result_image.height,
            format="png",
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=f"Invalid request: {error!s}") from error
    except Exception as error:
        raise HTTPException(
            status_code=500, detail=f"Generation failed: {error!s}"
        ) from error


@app.post("/text-to-image", response_model=ImageResponse)
async def text_to_image(req: TextToImageRequest) -> ImageResponse:
    """
    Generate an image from a text prompt using Stable Diffusion.

    Args:
        req: Request containing model_id, prompt, and generation parameters

    Returns:
        ImageResponse with base64-encoded image

    Raises:
        HTTPException: If generation fails
    """
    try:
        pipeline = load_pipeline(req.model_id)

        # Set random seed for reproducibility
        generator = None
        if req.seed is not None:
            generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu")
            generator.manual_seed(req.seed)

        # Build kwargs based on what the pipeline supports
        kwargs: dict[str, Any] = {
            "prompt": req.prompt,
            "num_inference_steps": req.num_inference_steps,
            "guidance_scale": req.guidance_scale,
            "generator": generator,
        }

        # Add optional parameters
        if req.width is not None:
            kwargs["width"] = req.width
        if req.height is not None:
            kwargs["height"] = req.height
        if req.negative_prompt is not None:
            kwargs["negative_prompt"] = req.negative_prompt

        # Generate image
        result = pipeline(**kwargs)

        # Extract image from result
        if hasattr(result, "images"):
            image = result.images[0]
        else:
            image = result[0]

        if not isinstance(image, Image.Image):
            raise ValueError("Expected PIL Image from pipeline")

        # Convert to base64
        image_b64 = image_to_base64(image)

        return ImageResponse(
            image=image_b64, width=image.width, height=image.height, format="png"
        )

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Generation failed: {error!s}") from error


@app.post("/inpaint", response_model=ImageResponse)
async def inpaint(req: InpaintRequest) -> ImageResponse:
    """
    Inpaint masked region of an image.

    Args:
        req: Request containing image, mask, prompt, and parameters

    Returns:
        ImageResponse with inpainted image

    Raises:
        HTTPException: If inpainting fails
    """
    try:
        # Decode images
        image = base64_to_image(req.image)
        mask = base64_to_image(req.mask)

        # Inpaint
        result_image = inpaint_manager.inpaint(
            image=image,
            mask=mask,
            prompt=req.prompt,
            model_id=req.model_id,
            strength=req.strength,
            width=req.width,
            height=req.height,
            num_inference_steps=req.num_inference_steps,
            guidance_scale=req.guidance_scale,
            negative_prompt=req.negative_prompt,
            seed=req.seed,
        )

        # Convert to base64
        image_b64 = image_to_base64(result_image)

        return ImageResponse(
            image=image_b64,
            width=result_image.width,
            height=result_image.height,
            format="png",
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=f"Invalid request: {error!s}") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {error!s}") from error


@app.post("/outpaint", response_model=ImageResponse)
async def outpaint(req: OutpaintRequest) -> ImageResponse:
    """
    Extend canvas in the specified direction with generated content.

    Args:
        req: Request containing image, direction, pixels, and parameters

    Returns:
        ImageResponse with extended image

    Raises:
        HTTPException: If outpainting fails
    """
    try:
        # Decode image
        image = base64_to_image(req.image)

        # Validate direction
        valid_directions = {"left", "right", "top", "bottom"}
        if req.direction not in valid_directions:
            raise ValueError(f"Direction must be one of {valid_directions}")

        # Outpaint
        result_image = inpaint_manager.outpaint(
            image=image,
            direction=req.direction,  # type: ignore
            pixels=req.pixels,
            prompt=req.prompt,
            model_id=req.model_id,
            strength=req.strength,
            num_inference_steps=req.num_inference_steps,
            guidance_scale=req.guidance_scale,
            negative_prompt=req.negative_prompt,
            seed=req.seed,
        )

        # Convert to base64
        image_b64 = image_to_base64(result_image)

        return ImageResponse(
            image=image_b64,
            width=result_image.width,
            height=result_image.height,
            format="png",
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=f"Invalid request: {error!s}") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Outpainting failed: {error!s}") from error


@app.post("/upscale", response_model=ImageResponse)
async def upscale_image(req: UpscaleRequest) -> ImageResponse:
    """
    Upscale an image using RealESRGAN or ESRGAN.

    Args:
        req: Request containing image, model, and factor

    Returns:
        ImageResponse with upscaled image

    Raises:
        HTTPException: If upscaling fails
    """
    try:
        # Decode image
        image = base64_to_image(req.image)

        # Validate model and factor
        if req.model not in ("esrgan", "realesrgan"):
            raise ValueError("Model must be 'esrgan' or 'realesrgan'")
        if req.factor not in (2, 4):
            raise ValueError("Factor must be 2 or 4")

        # Upscale
        result_image = upscale_manager.upscale(
            image=image,
            model=req.model,  # type: ignore
            factor=req.factor,  # type: ignore
        )

        # Convert to base64
        image_b64 = image_to_base64(result_image)

        return ImageResponse(
            image=image_b64,
            width=result_image.width,
            height=result_image.height,
            format="png",
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=f"Invalid request: {error!s}") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Upscaling failed: {error!s}") from error


@app.post("/face-restore", response_model=ImageResponse)
async def face_restore(req: FaceRestoreRequest) -> ImageResponse:
    """
    Restore faces in an image using GFPGAN.

    Args:
        req: Request containing image and strength

    Returns:
        ImageResponse with face-restored image

    Raises:
        HTTPException: If face restoration fails
    """
    try:
        # Decode image
        image = base64_to_image(req.image)

        # Restore faces
        result_image = upscale_manager.face_restore(
            image=image,
            strength=req.strength,
        )

        # Convert to base64
        image_b64 = image_to_base64(result_image)

        return ImageResponse(
            image=image_b64,
            width=result_image.width,
            height=result_image.height,
            format="png",
        )

    except ImportError as error:
        raise HTTPException(
            status_code=501, detail=f"GFPGAN not installed: {error!s}"
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500, detail=f"Face restoration failed: {error!s}"
        ) from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
