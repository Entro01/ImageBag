import requests
from io import BytesIO
from PIL import Image
import concurrent.futures

# Configuration
dimensions = [(135, 191), (249, 352), (355, 503), (707, 1000)]
image_paths = [
    '/catalog/product/d/3/d3312244w16may2022_2267_aprildone.jpeg',
    '/catalog/product/1/4/14.___xmcp01949_4.jpg',
    '/catalog/product/1/4/14.___xmcp01949_4.jpg'
]

def get_file_size(url):
    response = requests.get(url)
    return len(response.content)

def find_matching_quality(tool1_url, tool2_base_url, width, height, image_path):
    tool1_size = get_file_size(tool1_url)
    
    left, right = 1, 100
    best_quality = -1
    best_diff = float('inf')
    
    while left <= right:
        quality = (left + right) // 2
        tool2_url = f"{tool2_base_url}/{width}x{height}/filters:quality({quality}){image_path}"
        tool2_size = get_file_size(tool2_url)
        
        diff = abs(tool2_size - tool1_size)
        
        if diff < best_diff:
            best_diff = diff
            best_quality = quality
        
        if tool2_size < tool1_size:
            left = quality + 1
        else:
            right = quality - 1
    
    return best_quality, best_diff, tool1_size

def process_image(image_path):
    results = []
    for width, height in dimensions:
        tool1_url = f"https://imgs7.luluandsky.com{image_path}?tr=h-{height},w-{width}"
        tool2_base_url = f"https://d77er3fd7528x.cloudfront.net"
        
        quality, diff, tool1_size = find_matching_quality(tool1_url, tool2_base_url, width, height, image_path)
        results.append((width, height, quality, diff, tool1_size))
    return image_path, results

# Using ThreadPoolExecutor for concurrent processing
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    future_to_image = {executor.submit(process_image, path): path for path in image_paths}
    for future in concurrent.futures.as_completed(future_to_image):
        image_path = future_to_image[future]
        try:
            path, results = future.result()
            print(f"\nResults for {path}:")
            for width, height, quality, diff, tool1_size in results:
                print(f"Dimensions: {width}x{height}")
                print(f"Best matching quality: {quality}")
                print(f"Size difference: {diff} bytes")
                print(f"Tool 1 size: {tool1_size} bytes")
                print("-----")
        except Exception as exc:
            print(f"{image_path} generated an exception: {exc}")