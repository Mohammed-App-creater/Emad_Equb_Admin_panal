export function TableEmpty({ message = "No data found" }) {
  return (
    <div className="py-10 text-center text-sm text-muted">
      {message}
    </div>
  );
}
