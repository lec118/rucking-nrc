import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LiveWorkout from './pages/LiveWorkout';
import SlimWorkout from './pages/SlimWorkout';
import WorkoutProvider from './context/WorkoutContext';

export default function App() {
  return (
    <WorkoutProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-black text-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/live-workout" element={<LiveWorkout />} />
            <Route path="/slim" element={<SlimWorkout />} />
          </Routes>
        </div>
      </BrowserRouter>
    </WorkoutProvider>
  );
}
