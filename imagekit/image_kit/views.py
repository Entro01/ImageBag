from django.http import HttpResponse
import requests
from PIL import Image
from io import BytesIO

def resize_image(request):
    image_url = request.GET.get('url')
    width = int(request.GET.get('w', 0))
    height = int(request.GET.get('h', 0))
    quality = int(request.GET.get('q', 90))

    # checking for an image url
    if not image_url:
        return HttpResponse("Please provide an image URL.", status=400)

    try:
        # downloading image in bytes format
        response = requests.get(image_url)
        response.raise_for_status()

        # opening the image with PIL using BytesIO that creates a file like object in memory
        image = Image.open(BytesIO(response.content))

        # determine the original format of the image
        original_format = image.format

        # determining the scaling factor based on the larger dimension
        if width and height:
            if width >= height:
                scale_factor = width / image.width
            else:
                scale_factor = height / image.height
            
            # scaling the image
            new_size = (int(image.width * scale_factor), int(image.height * scale_factor))
            image = image.resize(new_size, Image.HAMMING)

            # calculating the cropping position
            x = (image.width - width) // 2
            y = (image.height - height) // 2

            # cropping image
            cropped_image = image.crop((x, y, x + width, y + height))

        # if only the width or height dimension is provided, it determines the scaling factor for the other dimension  
        elif width:
            new_width = width
            new_height = int(image.height * (width / image.width))
            image = image.resize((new_width, new_height), Image.HAMMING)
            cropped_image = image

        elif height:
            new_height = height
            new_width = int(image.width * (height / image.height))
            image = image.resize((new_width, new_height), Image.HAMMING)
            cropped_image = image

        else:
            cropped_image = image

        output = BytesIO()
        # Save the image in the original format
        cropped_image.save(output, format=original_format, quality=quality)
        output.seek(0)

        # return the cropped image data as the response
        return HttpResponse(output.getvalue(), content_type=f"image/{original_format.lower()}")
    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)
