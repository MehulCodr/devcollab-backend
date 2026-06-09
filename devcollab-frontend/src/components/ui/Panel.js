export default function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-2xl bg-slate-900 border border-slate-800 p-6 ${className}`}>
      {children}
    </section>
  );
}