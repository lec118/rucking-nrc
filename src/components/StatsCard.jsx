import { memo } from 'react';

const StatsCard = ({ label, value, unit, icon }) => (
  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
    <div className="flex items-start justify-between mb-4">
      <span className="text-4xl">{icon}</span>
    </div>
    <div className="space-y-1">
      <p className="text-zinc-400 text-sm font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold">{value}</span>
        <span className="text-zinc-500 text-lg">{unit}</span>
      </div>
    </div>
  </div>
);

export default memo(StatsCard);