import React, { useState } from 'react';
import { Camera, MapPin, Upload } from 'lucide-react';
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line } from 'recharts';
import axios from 'axios';
import { Alert, AlertDescription, AlertTitle, AlertDialog, AlertDialogAction } from '@/components/ui/alert';

const VehicleRoutingApp = () => {
  const [addresses, setAddresses] = useState([]);
  const [numAddresses, setNumAddresses] = useState(1);
  const [routeType, setRouteType] = useState('fastest');
  const [route, setRoute] = useState([]);
  const [error, setError] = useState(null);

  const handleAddressInput = (index, event) => {
    const newAddresses = [...addresses];
    newAddresses[index] = event.target.value;
    setAddresses(newAddresses);
  };

  const handleNumAddressesChange = (event) => {
    setNumAddresses(parseInt(event.target.value));
    setAddresses(new Array(parseInt(event.target.value)).fill(''));
  };

  const handleRouteTypeChange = (event) => {
    setRouteType(event.target.value);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const addressesFromFile = e.target.result.split('\n').filter((address) => address.trim() !== '');
        setAddresses(addressesFromFile);
        setNumAddresses(addressesFromFile.length);
      };
      reader.readAsText(file);
    }
  };

  const validateAddresses = async () => {
    try {
      // Validate addresses using Nominatim
      const validAddresses = await Promise.all(
        addresses.map(async (address) => {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
          );
          return response.data[0];
        })
      );

      setAddresses(validAddresses.filter((result) => result !== undefined).map((result) => result.display_name));
      calculateRoute(validAddresses.filter((result) => result !== undefined));
    } catch (error) {
      setError('Error validating addresses. Please check your input.');
    }
  };

  const calculateRoute = async (validAddresses) => {
    try {
      // Calculate route using OpenRouteService
      const response = await axios.get(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.OPENROUTE_API_KEY}&start=${validAddresses[0].lon},${validAddresses[0].lat}&via=${validAddresses.slice(1).map((address) => `${address.lon},${address.lat}`).join('&via=')}&end=${validAddresses[0].lon},${validAddresses[0].lat}`,
        {
          headers: {
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
          }
        }
      );

      const routeCoordinates = response.data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      setRoute(routeCoordinates);
    } catch (error) {
      setError('Error calculating route. Please try again later.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Vehicle Routing Application</h1>
      {error && (
        <Alert>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="mb-4">
        <label htmlFor="num-addresses" className="block font-medium mb-2">
          Number of Addresses:
        </label>
        <input
          type="number"
          id="num-addresses"
          min="1"
          value={numAddresses}
          onChange={handleNumAddressesChange}
          className="border rounded py-2 px-3 w-full"
        />
      </div>
      {/* Address input and file upload components remain the same */}
      <div className="mb-4">
        <label htmlFor="route-type" className="block font-medium mb-2">
          Route Type:
        </label>
        <select
          id="route-type"
          value={routeType}
          onChange={handleRouteTypeChange}
          className="border rounded py-2 px-3 w-full"
        >
          <option value="fastest">Fastest Route</option>
          <option value="shortest">Shortest Route</option>
        </select>
      </div>
      <button
        onClick={validateAddresses}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Calculate Route
      </button>
      {route.length > 0 && (
        <div className="mt-4">
          <LineChart width={800} height={400} data={route.map((coords, index) => ({ name: `Address ${index + 1}`, lat: coords[0], lng: coords[1] }))}>
            <XAxis dataKey="lat" />
            <YAxis dataKey="lng" />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="lat" stroke="#8884d8" />
            <Line type="monotone" dataKey="lng" stroke="#82ca9d" />
          </LineChart>
          <div className="flex items-center mt-4">
            <Camera className="mr-2" />
            {route.map((coords, index) => (
              <div key={index} className="flex items-center mr-4">
                <MapPin className="mr-2" />
                <span>Address {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleRoutingApp;
