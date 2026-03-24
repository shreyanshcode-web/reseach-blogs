import io
import logging
from typing import Tuple

from PIL import Image, ImageFilter
from transformers import pipeline

logger = logging.getLogger(__name__)

# Threshold for NSFW classification
NSFW_THRESHOLD = 0.5  # Adjust based on false-positive tolerance

class ImageModerator:
    """Uses a pre-trained ML model to classify and blur NSFW images."""

    def __init__(self):
        self.classifier = None

    def load_model(self):
        """Lazy load the model to save memory until first use."""
        if self.classifier is None:
            logger.info("Loading NSFW image classification model...")
            # Using a well-known lightweight NSFW detector model
            self.classifier = pipeline("image-classification", model="Falconsai/nsfw_image_detection")
            logger.info("NSFW model loaded successfully.")

    def process_image(self, image_bytes: bytes) -> Tuple[bytes, bool, float]:
        """
        Processes an image. If it is NSFW, returns a blurred version.
        
        Returns:
            Tuple containing:
            - bytes: The processed image (blurred if NSFW, original if not)
            - bool: True if the image was flagged as NSFW
            - float: Confidence score of the NSFW classification (0 to 1)
        """
        self.load_model()
        
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            logger.error(f"Failed to open image: {e}")
            raise ValueError("Invalid image data format.")

        # Classify image
        results = self.classifier(image)
        # Results look like: [{'score': 0.9, 'label': 'nsfw'}, {'score': 0.1, 'label': 'normal'}]
        
        nsfw_score = 0.0
        is_nsfw = False
        
        for res in results:
            if res['label'] == 'nsfw':
                nsfw_score = res['score']
                break
                
        if nsfw_score >= NSFW_THRESHOLD:
            is_nsfw = True
            
        if is_nsfw:
            # Apply heavy blur
            blurred_image = image.filter(ImageFilter.GaussianBlur(radius=50))
            
            output_buffer = io.BytesIO()
            # Save as JPEG
            blurred_image.save(output_buffer, format="JPEG", quality=85)
            return output_buffer.getvalue(), True, nsfw_score
            
        return image_bytes, False, nsfw_score

# Singleton instance
image_moderator = ImageModerator()
