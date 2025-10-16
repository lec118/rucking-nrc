// src/components/WorkoutSummary.tsx
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { WorkoutSummaryProps, LatLng } from '../types/workout';
import { formatHMS, toKm, toAvgSpeedKmh } from '../utils/format';
import 'leaflet/dist/leaflet.css';

// Default Leaflet marker icons (fix for webpack)
const startIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function WorkoutSummary({ path, totalDist, elapsedMs, onStartNew }: WorkoutSummaryProps) {
  const totalDistKm = toKm(totalDist); // "0.00" format
  const durationStr = formatHMS(elapsedMs); // "HH:MM:SS" format
  const avgSpeedKmh = toAvgSpeedKmh(totalDist / 1000, elapsedMs); // "5.3" or "--"

  // Calculate map center and bounds
  const center: LatLng = path.length > 0
    ? path[Math.floor(path.length / 2)]
    : [37.5665, 126.9780]; // Seoul default

  return (
    <div className="h-screen flex flex-col bg-[#0A0E0D] text-[#E5ECE8]">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent p-4 border-b border-[#2D3A35]/50">
        <h1 className="text-lg font-mono font-bold text-[#E5ECE8] uppercase tracking-wider">
          WORKOUT SUMMARY
        </h1>
      </div>

      {/* Map Mini-view */}
      <div className="relative h-80 bg-[#1B2A24]">
        {typeof window !== 'undefined' && path.length > 0 ? (
          <MapContainer
            center={center}
            zoom={14}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-dark-filter"
            />

            {/* Route Polyline */}
            <Polyline
              positions={path}
              pathOptions={{
                color: '#00B46E',
                weight: 4,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Start Marker */}
            {path.length > 0 && (
              <Marker position={path[0]} icon={startIcon} />
            )}

            {/* End Marker */}
            {path.length > 1 && (
              <Marker position={path[path.length - 1]} icon={endIcon} />
            )}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-[#6B7872] font-mono text-sm">No route data</p>
          </div>
        )}

        {/* Dark overlay for consistency */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0A0E0D]/30 via-[#00B46E]/[0.04] to-[#0A0E0D]/50"></div>
      </div>

      {/* Summary Cards */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
          {/* Distance Card */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-6">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              TOTAL DISTANCE
            </p>
            <p className="text-3xl font-mono font-bold text-[#00B46E] tabular-nums" aria-label="distance-kilometers">
              {totalDistKm}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">kilometers</p>
          </div>

          {/* Time Card */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-6">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              TOTAL TIME
            </p>
            <p className="text-3xl font-mono font-bold text-[#E5ECE8] tabular-nums" aria-label="elapsed-time-hh-mm-ss">
              {durationStr}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">duration</p>
          </div>

          {/* Speed Card */}
          <div className="bg-[#1C2321]/80 backdrop-blur-sm border border-[#2D3A35]/60 rounded-sm p-6">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-2">
              AVG SPEED
            </p>
            <p className="text-3xl font-mono font-bold text-[#E5ECE8] tabular-nums" aria-label="average-speed-kmh">
              {avgSpeedKmh}
            </p>
            <p className="text-xs font-mono text-[#6B7872] mt-1">km/h</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto mb-8">
          <div className="bg-[#1C2321]/60 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">
              ROUTE POINTS
            </p>
            <p className="text-xl font-mono font-bold text-[#E5ECE8] tabular-nums">
              {path.length}
            </p>
          </div>

          <div className="bg-[#1C2321]/60 backdrop-blur-sm border border-[#2D3A35]/40 rounded-sm p-4">
            <p className="text-xs font-mono text-[#A8B5AF] uppercase tracking-wider mb-1">
              AVG PACE
            </p>
            <p className="text-xl font-mono font-bold text-[#E5ECE8] tabular-nums">
              {totalDist > 0 && elapsedMs > 0
                ? ((elapsedMs / 1000 / 60) / (totalDist / 1000)).toFixed(1)
                : '--'}
            </p>
            <p className="text-xs font-mono text-[#6B7872]">min/km</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="max-w-md mx-auto">
          <button
            onClick={onStartNew}
            className="w-full bg-[#00B46E] hover:bg-[#008556] active:bg-[#00573B] text-[#0A0E0D] font-mono font-bold text-sm uppercase tracking-widest py-4 rounded-sm shadow-lg transition-all duration-150 active:scale-[0.98]"
            style={{ boxShadow: '0 4px 16px rgba(0, 180, 110, 0.25)' }}
          >
            <span className="flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-[#0A0E0D] rounded-full"></span>
              START NEW WORKOUT
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
