from django.http import HttpResponse
import requests
from PIL import Image
from io import BytesIO

def resize_image(request):
    image_url = request.GET.get('url')
    width = int(request.GET.get('w', 0))
    height = int(request.GET.get('h', 0))
    quality = int(request.GET.get('q', 90))

    # Checking for an image URL
    if not image_url:
        return HttpResponse("Please provide an image URL.", status=400)

    try:
        # Downloading image in bytes format
        response = requests.get(image_url)
        response.raise_for_status()

        # Opening the image with PIL using BytesIO that creates a file-like object in memory
        image = Image.open(BytesIO(response.content))

        # Determine the original format of the image
        original_format = image.format

        # Calculate the original image's aspect ratio
        original_width, original_height = image.size
        original_aspect_ratio = original_width / original_height

        if width and height:
            # Calculate the target aspect ratio
            target_aspect_ratio = width / height

            # Determine crop dimensions to maintain aspect ratio without black bars
            if original_aspect_ratio > target_aspect_ratio:
                # Original is wider, crop horizontally
                new_width = int(original_height * target_aspect_ratio)
                x = (original_width - new_width) // 2
                y = 0
                crop_box = (x, y, x + new_width, original_height)
            else:
                # Original is taller, crop vertically
                new_height = int(original_width / target_aspect_ratio)
                x = 0
                y = (original_height - new_height) // 2
                crop_box = (x, y, original_width, y + new_height)

            # Crop the image
            cropped_image = image.crop(crop_box)

            # Resize the cropped image to the desired dimensions
            resized_image = cropped_image.resize((width, height), Image.LANCZOS)
        else:
            # No resizing needed
            resized_image = image

        # Save the image in the original format
        output = BytesIO()
        resized_image.save(output, format=original_format, quality=quality)
        output.seek(0)

        # Return the resized image data as the response
        return HttpResponse(output.getvalue(), content_type=f"image/{original_format.lower()}")

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)
