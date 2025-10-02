// Calculate average pace (min/km)
export const calculatePace = (duration, distance) => {
  if (!distance || distance === 0) return 0;
  return duration / distance;
};

// Group workouts by week
export const groupByWeek = (workouts) => {
  const groups = {};

  workouts.forEach(workout => {
    const date = new Date(workout.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!groups[weekKey]) {
      groups[weekKey] = {
        week: weekKey,
        distance: 0,
        duration: 0,
        count: 0,
        avgPace: 0
      };
    }

    groups[weekKey].distance += workout.distance || 0;
    groups[weekKey].duration += workout.duration || 0;
    groups[weekKey].count += 1;
  });

  // Calculate average pace for each week
  Object.values(groups).forEach(week => {
    week.avgPace = calculatePace(week.duration, week.distance);
  });

  return Object.values(groups).sort((a, b) => new Date(a.week) - new Date(b.week));
};

// Calculate weekly consistency (workouts per week)
export const calculateConsistency = (workouts) => {
  if (workouts.length === 0) return 0;

  const weeks = groupByWeek(workouts);
  const totalWeeks = weeks.length;
  const totalWorkouts = workouts.length;

  return totalWeeks > 0 ? (totalWorkouts / totalWeeks).toFixed(1) : 0;
};

// Calculate improvement rate (comparing first vs last 3 workouts)
export const calculateImprovement = (workouts) => {
  if (workouts.length < 6) return null;

  const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstThree = sorted.slice(0, 3);
  const lastThree = sorted.slice(-3);

  const firstAvgPace = firstThree.reduce((sum, w) => sum + calculatePace(w.duration, w.distance), 0) / 3;
  const lastAvgPace = lastThree.reduce((sum, w) => sum + calculatePace(w.duration, w.distance), 0) / 3;

  const improvement = ((firstAvgPace - lastAvgPace) / firstAvgPace) * 100;

  return {
    percentage: improvement.toFixed(1),
    isImproving: improvement > 0
  };
};

// Get last 7 days of activity
export const getLast7Days = (workouts) => {
  const today = new Date();
  const last7Days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];

    const dayWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.date).toISOString().split('T')[0];
      return workoutDate === dateKey;
    });

    const totalDistance = dayWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const totalDuration = dayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);

    last7Days.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      fullDate: dateKey,
      distance: totalDistance,
      duration: totalDuration,
      count: dayWorkouts.length
    });
  }

  return last7Days;
};

// Format pace for display (mm:ss/km)
export const formatPace = (paceMinutes) => {
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Group workouts by month
export const groupByMonth = (workouts) => {
  const groups = {};

  workouts.forEach(workout => {
    const date = new Date(workout.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!groups[monthKey]) {
      groups[monthKey] = {
        month: monthKey,
        distance: 0,
        duration: 0,
        count: 0,
        totalWeight: 0,
        weightCount: 0
      };
    }

    groups[monthKey].distance += workout.distance || 0;
    groups[monthKey].duration += workout.duration || 0;
    groups[monthKey].count += 1;
    if (workout.weight) {
      groups[monthKey].totalWeight += workout.weight;
      groups[monthKey].weightCount += 1;
    }
  });

  return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
};

// Calculate average weight
export const calculateAverageWeight = (workouts) => {
  const workoutsWithWeight = workouts.filter(w => w.weight && w.weight > 0);
  if (workoutsWithWeight.length === 0) return 0;

  const totalWeight = workoutsWithWeight.reduce((sum, w) => sum + w.weight, 0);
  return (totalWeight / workoutsWithWeight.length).toFixed(1);
};

// Get statistics for a time period
export const getStatsForPeriod = (workouts, period = 'all') => {
  let filteredWorkouts = workouts;

  if (period === 'daily') {
    const today = new Date().toISOString().split('T')[0];
    filteredWorkouts = workouts.filter(w =>
      new Date(w.date).toISOString().split('T')[0] === today
    );
  } else if (period === 'weekly') {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    filteredWorkouts = workouts.filter(w => new Date(w.date) >= weekStart);
  } else if (period === 'monthly') {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    filteredWorkouts = workouts.filter(w => new Date(w.date) >= monthStart);
  }

  const totalDistance = filteredWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const totalDuration = filteredWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
  const avgWeight = calculateAverageWeight(filteredWorkouts);
  const consistency = period === 'weekly'
    ? filteredWorkouts.length
    : period === 'monthly'
    ? calculateConsistency(filteredWorkouts)
    : filteredWorkouts.length;

  return {
    totalDistance: totalDistance.toFixed(2),
    totalDuration: Math.floor(totalDuration),
    avgWeight,
    consistency: typeof consistency === 'number' ? consistency : parseFloat(consistency),
    count: filteredWorkouts.length
  };
};