export default function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-slate-800 text-slate-300",
    blue: "bg-blue-500/10 text-blue-300",
    green: "bg-emerald-500/10 text-emerald-300",
    orange: "bg-orange-500/10 text-orange-300",
    red: "bg-red-500/10 text-red-300"
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}