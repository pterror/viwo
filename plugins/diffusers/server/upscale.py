"""
Upscaling and face restoration manager.

Provides image quality enhancement using RealESRGAN and face restoration using GFPGAN.
"""

from typing import Any, Literal

import cv2
import numpy as np
from basicsr.archs.rrdbnet_arch import RRDBNet
from PIL import Image
from realesrgan import RealESRGANer

try:
    from gfpgan import GFPGANer
    GFPGAN_AVAILABLE = True
except ImportError:
    GFPGAN_AVAILABLE = False

UpscaleModel = Literal["esrgan", "realesrgan"]


class UpscaleManager:
    """Manages upscaling models and face restoration."""

    def __init__(self):
        """Initialize the upscale manager with empty cache."""
        self.upscalers: dict[str, RealESRGANer] = {}
        self.face_restorer: Any | None = None

    def _get_upscaler(self, model: UpscaleModel, scale: int) -> RealESRGANer:
        """
        Get or create upscaler for the given model and scale.

        Args:
            model: Model type (esrgan or realesrgan)
            scale: Upscale factor (2 or 4)

        Returns:
            RealESRGANer instance
        """
        key = f"{model}_{scale}x"
        if key in self.upscalers:
            return self.upscalers[key]

        print(f"Loading upscale model: {key}")

        # Select model architecture and weights
        if model == "realesrgan":
            if scale == 4:
                model_name = "RealESRGAN_x4plus"
                netscale = 4
            else:  # scale == 2
                model_name = "RealESRGAN_x2plus"
                netscale = 2
        else:  # esrgan
            model_name = "ESRGAN"
            netscale = scale

        # Create model architecture
        model_arch = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=23,
            num_grow_ch=32,
            scale=netscale,
        )

        # Create upscaler
        upscaler = RealESRGANer(
            scale=netscale,
            model_path=f"https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/{model_name}.pth",
            model=model_arch,
            tile=0,  # No tiling for smaller images
            tile_pad=10,
            pre_pad=0,
            half=False,  # Use FP32 for better quality
        )

        self.upscalers[key] = upscaler
        return upscaler

    def upscale(
        self,
        image: Image.Image,
        model: UpscaleModel = "realesrgan",
        factor: Literal[2, 4] = 2,
    ) -> Image.Image:
        """
        Upscale an image using RealESRGAN or ESRGAN.

        Args:
            image: Input PIL Image
            model: Model to use (realesrgan or esrgan)
            factor: Upscale factor (2 or 4)

        Returns:
            Upscaled PIL Image
        """
        upscaler = self._get_upscaler(model, factor)

        # Convert PIL to numpy array (RGB -> BGR for OpenCV)
        img_array = np.array(image)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        # Upscale
        output_array, _ = upscaler.enhance(img_array, outscale=factor)

        # Convert back to PIL (BGR -> RGB)
        output_array = cv2.cvtColor(output_array, cv2.COLOR_BGR2RGB)
        return Image.fromarray(output_array)

    def face_restore(
        self,
        image: Image.Image,
        strength: float = 1.0,
    ) -> Image.Image:
        """
        Restore faces in an image using GFPGAN.

        Args:
            image: Input PIL Image
            strength: Restoration strength (0.0-1.0)

        Returns:
            Face-restored PIL Image

        Raises:
            ImportError: If GFPGAN is not installed
        """
        if not GFPGAN_AVAILABLE:
            raise ImportError(
                "GFPGAN is not installed. Install with: pip install gfpgan"
            )

        # Lazy load face restorer
        if self.face_restorer is None:
            print("Loading GFPGAN face restoration model")
            self.face_restorer = GFPGANer(
                model_path="https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth",
                upscale=1,  # Don't upscale, just restore
                arch="clean",
                channel_multiplier=2,
                bg_upsampler=None,
            )

        # Convert PIL to numpy array (RGB -> BGR)
        img_array = np.array(image)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        # Restore faces
        _, _, output_array = self.face_restorer.enhance(
            img_array, has_aligned=False, only_center_face=False, paste_back=True, weight=strength
        )

        # Convert back to PIL (BGR -> RGB)
        output_array = cv2.cvtColor(output_array, cv2.COLOR_BGR2RGB)
        return Image.fromarray(output_array)
