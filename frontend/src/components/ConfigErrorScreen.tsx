export function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div className="center-screen">
      <div className="card narrow">
        <h1>Configuration required</h1>
        <p className="error-text">{message}</p>
      </div>
    </div>
  );
}
