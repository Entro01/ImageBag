from django.urls import path
from django.http import HttpResponse
from . import views

def health_check(request):
    return HttpResponse("OK")

urlpatterns = [
    path('', health_check),  # Root URL for health check
    path('resize/', views.resize_image, name='resize_image'),
]
