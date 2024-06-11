from django.http import HttpResponse
import requests
from PIL import Image, ImageOps
from io import BytesIO

def resize_image(request):
    image_url = request.GET.get('url')
    width = int(request.GET.get('w', 0))
    height = int(request.GET.get('h', 0))

    if not image_url:
        return HttpResponse("Please provide an image URL.", status=400)

    try:
        response = requests.get(image_url)
        response.raise_for_status()

        image = Image.open(BytesIO(response.content))

        if width and height:
            if width >= height:
                scale_factor = width / image.width
            else:
                scale_factor = height / image.height

            new_size = (int(image.width * scale_factor), int(image.height * scale_factor))
            image = image.resize(new_size, Image.LANCZOS)

            x = (image.width - width) // 2
            y = (image.height - height) // 2

            cropped_image = image.crop((x, y, x + width, y + height))

        elif width:
            new_width = width
            new_height = int(image.height * (width / image.width))
            image = image.resize((new_width, new_height), Image.LANCZOS)
            cropped_image = image

        elif height:
            new_height = height
            new_width = int(image.width * (height / image.height))
            image = image.resize((new_width, new_height), Image.LANCZOS)
            cropped_image = image

        else:
            cropped_image = image

        output = BytesIO()
        cropped_image.save(output, format="WebP", lossless=True, quality=100)
        output.seek(0)

        return HttpResponse(output.getvalue(), content_type="image/webp")
    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)