export default function StatCard({ title, value, icon: Icon, trend, trendValue, color = "blue" }) {
  const colorMap = {
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-green-400 bg-green-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    red: "text-red-400 bg-red-500/10",
  };

  const iconClass = colorMap[color] || colorMap.blue;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        {Icon && (
          <div className={`p-2 rounded-lg ${iconClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-3xl font-bold text-white">{value}</p>
        
        {trend && trendValue && (
          <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
