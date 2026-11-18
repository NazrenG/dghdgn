export function Spinner({ label }: { label: string }) {
  return (
    <div className="center-screen">
      <div className="spinner" aria-hidden="true" />
      <p className="muted">{label}</p>
    </div>
  );
}
