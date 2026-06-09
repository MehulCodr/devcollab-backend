export default function EmptyState({ message }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
      <p className="text-slate-400">{message}</p>
    </div>
  );
}