import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LiveWorkout from './pages/LiveWorkout';
import History from './pages/History';
import WorkoutProvider from './context/WorkoutContext';
import { UserProfileProvider } from './context/UserProfileContext';

export default function App() {
  return (
    <UserProfileProvider>
      <WorkoutProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-black text-white">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/live-workout" element={<LiveWorkout />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </div>
        </BrowserRouter>
      </WorkoutProvider>
    </UserProfileProvider>
  );
}
