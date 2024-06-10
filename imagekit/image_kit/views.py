from django.http import HttpResponse
import requests
from PIL import Image
from io import BytesIO

def resize_image(request):
    # Get the image URL, width, and height from the query parameters
    image_url = request.GET.get('url')
    width = int(request.GET.get('w', 0))
    height = int(request.GET.get('h', 0))

    # Check if image_url is provided
    if not image_url:
        return HttpResponse("Please provide an image URL.", status=400)

    try:
        # Download the image from the URL
        response = requests.get(image_url)
        response.raise_for_status()

        # Open the image using PIL
        image = Image.open(BytesIO(response.content))

        # Resize the image
        if width and height:
            image = image.resize((width, height))
        elif width:
            # Resize based on width and preserve aspect ratio
            width_percent = (width / float(image.size[0]))
            height = int((float(image.size[1]) * float(width_percent)))
            image = image.resize((width, height), Image.ANTIALIAS)
        elif height:
            # Resize based on height and preserve aspect ratio
            height_percent = (height / float(image.size[1]))
            width = int((float(image.size[0]) * float(height_percent)))
            image = image.resize((width, height), Image.ANTIALIAS)

        # Save the resized image to a BytesIO object
        output = BytesIO()
        image.save(output, format="JPEG")
        output.seek(0)

        # Return the resized image data as the response
        return HttpResponse(output.getvalue(), content_type="image/jpeg")

    except Exception as e:
        return HttpResponse(f"Error: {str(e)}", status=500)