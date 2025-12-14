"""Traditional upscaling methods and hybrid img2img upscaling."""

from typing import Literal

import cv2
import numpy as np
import torch
from diffusers import StableDiffusionImg2ImgPipeline
from PIL import Image

UpscaleMethod = Literal["nearest", "bilinear", "bicubic", "lanczos", "area"]


def traditional_upscale(
    image: Image.Image,
    method: UpscaleMethod,
    factor: int = 2,
) -> Image.Image:
    """
    Upscale using traditional interpolation methods.

    Args:
        image: Input PIL Image
        method: Interpolation method
        factor: Upscale factor (2 or 4)

    Returns:
        Upscaled PIL Image
    """
    new_size = (image.width * factor, image.height * factor)

    if method == "nearest":
        return image.resize(new_size, Image.NEAREST)
    if method == "bilinear":
        return image.resize(new_size, Image.BILINEAR)
    if method == "bicubic":
        return image.resize(new_size, Image.BICUBIC)
    if method == "lanczos":
        return image.resize(new_size, Image.LANCZOS)
    if method == "area":
        # Use cv2 for INTER_AREA
        img_array = np.array(image)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        resized = cv2.resize(img_array, new_size, interpolation=cv2.INTER_AREA)
        resized = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        return Image.fromarray(resized)

    raise ValueError(f"Unknown method: {method}")


class Img2ImgUpscaler:
    """Hybrid upscaler using traditional upscale + img2img refinement."""

    def __init__(self):
        """Initialize with empty pipeline cache."""
        self.pipelines: dict[str, StableDiffusionImg2ImgPipeline] = {}

    def _load_pipeline(self, model_id: str) -> StableDiffusionImg2ImgPipeline:
        """Load or retrieve cached img2img pipeline."""
        if model_id in self.pipelines:
            return self.pipelines[model_id]

        print(f"Loading img2img pipeline: {model_id}")
        pipeline = StableDiffusionImg2ImgPipeline.from_pretrained(
            model_id, torch_dtype=torch.float16
        )

        if torch.cuda.is_available():
            pipeline = pipeline.to("cuda")

        self.pipelines[model_id] = pipeline
        return pipeline

    def upscale(
        self,
        image: Image.Image,
        prompt: str,
        model_id: str = "runwayml/stable-diffusion-v1-5",
        factor: int = 2,
        denoise_strength: float = 0.3,
        upscale_method: UpscaleMethod = "lanczos",
        num_inference_steps: int = 20,
        guidance_scale: float = 7.5,
        negative_prompt: str | None = None,
        seed: int | None = None,
    ) -> Image.Image:
        """
        ComfyUI-style upscale: traditional upscale + img2img refinement.

        This gives better quality than pure traditional methods while being
        faster than diffusion-only upscaling.

        Args:
            image: Input PIL Image
            prompt: Text prompt for refinement
            model_id: Model to use
            factor: Upscale factor (2 or 4)
            denoise_strength: Low value = more faithful to input (0.2-0.4)
            upscale_method: Traditional method to use first
            num_inference_steps: Number of denoising steps
            guidance_scale: Classifier-free guidance scale
            negative_prompt: Negative prompt (optional)
            seed: Random seed (optional)

        Returns:
            Upscaled and refined PIL Image
        """
        # Step 1: Traditional upscale
        upscaled = traditional_upscale(image, upscale_method, factor)

        # Step 2: img2img refinement with low denoise
        pipeline = self._load_pipeline(model_id)

        # Generator for seed
        generator = None
        if seed is not None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            generator = torch.Generator(device=device).manual_seed(seed)

        # img2img with low strength (high init image influence)
        result = pipeline(
            prompt=prompt,
            image=upscaled,
            strength=denoise_strength,  # Low value = more faithful to input
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            negative_prompt=negative_prompt,
            generator=generator,
        )

        return result.images[0]
