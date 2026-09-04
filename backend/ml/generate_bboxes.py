# backend/ml/generate_bboxes.py
import json
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class Nominatim:
    """Small standard-library wrapper for OpenStreetMap's Nominatim API."""

    def __init__(self, user_agent):
        self.user_agent = user_agent

    def geocode(self, query):
        params = urlencode({"q": query, "format": "jsonv2", "limit": 1})
        request = Request(
            f"https://nominatim.openstreetmap.org/search?{params}",
            headers={"User-Agent": self.user_agent},
        )
        with urlopen(request, timeout=15) as response:
            results = json.load(response)

        if not results:
            return None

        result = results[0]
        return type(
            "Location",
            (),
            {"latitude": float(result["lat"]), "longitude": float(result["lon"])},
        )()

# 1. Initialize the geocoder (OpenStreetMap's free API)
geolocator = Nominatim(user_agent="sih_flood_nowcasting")

# 2. Your list of target urban areas
urban_zones = [
    "Velachery, Chennai, India",
    "Dadar, Mumbai, India",
    "Bellandur, Bengaluru, India",
    "Begumpet, Hyderabad, India",
    "Gandipet, Hyderabad, India",
    "ITO, New Delhi, India",
    "Salt Lake Sector V, Kolkata, India",
    "Kalamassery, Kochi, India",
    "Dispur, Guwahati, India",
    "Rajendra Nagar, Patna, India",
    "Shivajinagar, Pune, India",
    "T Nagar, Chennai, India",
    "Aluva, Kochi, India",
    "Koramanagala, Bengaluru, India",
    "Andheri East, Mumbai, India"
]

generated_bboxes = {}

print("Generating 5x5km Bounding Boxes...\n")

# 3. Loop through each zone, find the center, and calculate the box
for zone in urban_zones:
    try:
        location = geolocator.geocode(zone)
        
        if location:
            lat = location.latitude
            lon = location.longitude
            
            north = lat + 0.0225
            south = lat - 0.0225
            east = lon + 0.0250
            west = lon - 0.0250
            
            clean_name = zone.split(',')[0].strip().replace(" ", "_")
            generated_bboxes[clean_name] = (west, south, east, north)
            
            print(f"✅ {clean_name} Processed.")
        else:
            print(f"❌ Could not find coordinates for: {zone}")
            
        time.sleep(1)
        
    except Exception as e:
        print(f"Error processing {zone}: {e}")

print("\n--- COPY AND PASTE THIS DICTIONARY INTO YOUR BACKEND / SCRIPTS ---\n")
print("locations = {")
for name, bbox in generated_bboxes.items():
    print(f'    "{name}": ({bbox[0]:.4f}, {bbox[1]:.4f}, {bbox[2]:.4f}, {bbox[3]:.4f}),')
print("}")