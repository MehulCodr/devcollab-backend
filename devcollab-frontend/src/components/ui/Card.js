export default function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 p-5 ${className}`}>
      {children}
    </div>
  );
}
