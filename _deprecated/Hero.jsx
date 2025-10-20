import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-12 md:p-16">
      <div className="relative z-10">
        <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight">
          GOOD<br />RUCK
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-md">
          Track your rucking journey. Build strength. Go the distance.
        </p>
        <button
          onClick={() => navigate('/live-workout')}
          className="bg-white text-black font-bold text-lg px-8 py-4 rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 active:scale-95"
        >
          Start Live Workout
        </button>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
    </div>
  );
}