import os
from flask import Flask, request, jsonify, render_template
import googlemaps

app = Flask(__name__)

# Function to read addresses from a text file
def read_addresses(file_path):
    with open(file_path, 'r') as file:
        addresses = [line.strip() for line in file.readlines()]
    return addresses

# Function to geocode and correct addresses using Google Maps API
def geocode_and_correct_addresses(addresses, api_key):
    gmaps = googlemaps.Client(key=api_key)
    corrected_addresses = []
    for address in addresses:
        result = gmaps.geocode(address)
        if result:
            # Get the formatted (corrected) address from Google Maps API
            corrected_address = result[0]['formatted_address']
            lat_lng = result[0]['geometry']['location']
            corrected_addresses.append((corrected_address, lat_lng['lat'], lat_lng['lng']))
        else:
            # If address is not found, add it with 'None' for lat/lng
            corrected_addresses.append((address, None, None))
    return corrected_addresses

# Function to optimize the route
def optimize_route(addresses, api_key):
    gmaps = googlemaps.Client(key=api_key)
    waypoints = [f"{lat},{lng}" for _, lat, lng in addresses if lat is not None and lng is not None]
    optimized_route = gmaps.directions(waypoints[0], waypoints[-1], waypoints=waypoints[1:-1], optimize_waypoints=True)
    return optimized_route

@app.route('/')
def index():
    return render_template('index.html')

# Route to check and correct addresses
@app.route('/check_addresses', methods=['POST'])
def check_addresses():
    file = request.files['file']
    file.save("addresses.txt")
    addresses = read_addresses("addresses.txt")
    corrected_addresses = geocode_and_correct_addresses(addresses, api_key="YOUR_GOOGLE_MAPS_API_KEY")

    # Return corrected addresses for user confirmation
    return jsonify(corrected_addresses)

# Route to optimize the route after confirmation
@app.route('/optimize', methods=['POST'])
def optimize():
    corrected_addresses = request.json.get('corrected_addresses')
    optimized_route = optimize_route(corrected_addresses, api_key="YOUR_GOOGLE_MAPS_API_KEY")

    # Return optimized route coordinates for map rendering
    optimized_coords = [{"lat": step['start_location']['lat'], "lng": step['start_location']['lng']} for step in optimized_route[0]['legs'][0]['steps']]
    return jsonify(optimized_coords)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
