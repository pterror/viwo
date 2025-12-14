"""
Inpainting and outpainting manager for guided image regeneration.

Provides inpainting for selective regeneration and outpainting for canvas extension.
"""

from typing import Any, Literal

import numpy as np
import torch
from diffusers import StableDiffusionInpaintPipeline
from PIL import Image

Direction = Literal["left", "right", "top", "bottom"]


class InpaintManager:
    """Manages inpainting and outpainting pipelines."""

    def __init__(self):
        """Initialize the inpaint manager with empty cache."""
        self.pipelines: dict[str, StableDiffusionInpaintPipeline] = {}

    def _load_pipeline(self, model_id: str) -> StableDiffusionInpaintPipeline:
        """
        Load or retrieve cached inpainting pipeline.

        Args:
            model_id: Model identifier (e.g., runwayml/stable-diffusion-inpainting)

        Returns:
            Loaded pipeline instance
        """
        if model_id in self.pipelines:
            return self.pipelines[model_id]

        print(f"Loading inpaint pipeline: {model_id}")
        pipeline = StableDiffusionInpaintPipeline.from_pretrained(
            model_id, torch_dtype=torch.float16
        )

        if torch.cuda.is_available():
            pipeline = pipeline.to("cuda")

        self.pipelines[model_id] = pipeline
        return pipeline

    def inpaint(
        self,
        image: Image.Image,
        mask: Image.Image,
        prompt: str,
        model_id: str = "runwayml/stable-diffusion-inpainting",
        strength: float = 0.8,
        width: int | None = None,
        height: int | None = None,
        num_inference_steps: int = 50,
        guidance_scale: float = 7.5,
        negative_prompt: str | None = None,
        seed: int | None = None,
    ) -> Image.Image:
        """
        Inpaint masked region of an image.

        Args:
            image: Input image to inpaint
            mask: Mask image (white = inpaint, black = keep)
            prompt: Text prompt for inpainting
            model_id: Model to use for inpainting
            strength: Inpainting strength (0.0-1.0)
            width: Output width (optional, defaults to image width)
            height: Output height (optional, defaults to image height)
            num_inference_steps: Number of denoising steps
            guidance_scale: Classifier-free guidance scale
            negative_prompt: Negative prompt (optional)
            seed: Random seed (optional)

        Returns:
            Inpainted PIL Image
        """
        pipeline = self._load_pipeline(model_id)

        # Use input image dimensions if not specified
        if width is None:
            width = image.width
        if height is None:
            height = image.height

        # Resize image and mask to match requested dimensions
        if image.width != width or image.height != height:
            image = image.resize((width, height), Image.LANCZOS)
        if mask.width != width or mask.height != height:
            mask = mask.resize((width, height), Image.LANCZOS)

        # Set random seed
        generator = None
        if seed is not None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            generator = torch.Generator(device=device)
            generator.manual_seed(seed)

        # Build generation kwargs
        kwargs: dict[str, Any] = {
            "prompt": prompt,
            "image": image,
            "mask_image": mask,
            "num_inference_steps": num_inference_steps,
            "guidance_scale": guidance_scale,
            "strength": strength,
            "generator": generator,
        }

        if negative_prompt is not None:
            kwargs["negative_prompt"] = negative_prompt

        # Generate
        result = pipeline(**kwargs)

        # Extract image
        if hasattr(result, "images"):
            output_image = result.images[0]
        else:
            output_image = result[0]

        if not isinstance(output_image, Image.Image):
            raise ValueError("Expected PIL Image from pipeline")

        return output_image

    def outpaint(
        self,
        image: Image.Image,
        direction: Direction,
        pixels: int,
        prompt: str,
        model_id: str = "runwayml/stable-diffusion-inpainting",
        strength: float = 0.8,
        num_inference_steps: int = 50,
        guidance_scale: float = 7.5,
        negative_prompt: str | None = None,
        seed: int | None = None,
    ) -> Image.Image:
        """
        Extend canvas in the specified direction with generated content.

        Args:
            image: Input image to extend
            direction: Direction to extend (left, right, top, bottom)
            pixels: Number of pixels to extend
            prompt: Text prompt for generation
            model_id: Model to use for inpainting
            strength: Generation strength (0.0-1.0)
            num_inference_steps: Number of denoising steps
            guidance_scale: Classifier-free guidance scale
            negative_prompt: Negative prompt (optional)
            seed: Random seed (optional)

        Returns:
            Extended PIL Image
        """
        # Calculate new canvas dimensions
        if direction in ("left", "right"):
            new_width = image.width + pixels
            new_height = image.height
        else:  # top or bottom
            new_width = image.width
            new_height = image.height + pixels

        # Create extended canvas
        extended = Image.new("RGB", (new_width, new_height), (128, 128, 128))

        # Create mask (white = generate, black = keep)
        mask = Image.new("L", (new_width, new_height), 255)  # Start with all white

        # Paste original image and update mask
        if direction == "right":
            extended.paste(image, (0, 0))
            mask.paste(0, (0, 0, image.width, image.height))  # Black where image exists
        elif direction == "left":
            extended.paste(image, (pixels, 0))
            mask.paste(0, (pixels, 0, new_width, new_height))
        elif direction == "bottom":
            extended.paste(image, (0, 0))
            mask.paste(0, (0, 0, image.width, image.height))
        else:  # top
            extended.paste(image, (0, pixels))
            mask.paste(0, (0, pixels, new_width, new_height))

        # Use inpaint to generate the extended region
        return self.inpaint(
            image=extended,
            mask=mask,
            prompt=prompt,
            model_id=model_id,
            strength=strength,
            width=new_width,
            height=new_height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            negative_prompt=negative_prompt,
            seed=seed,
        )
