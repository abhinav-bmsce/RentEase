export function DataNotice({ error }: { error: Error }) {
  const code = "code" in error ? String(error.code) : "";
  return (
    <div role="alert" className="data-notice space-y-2">
      <p className="font-semibold">We couldn’t load this information.</p>
      <p className="text-muted-foreground">
        {code === "permission-denied"
          ? "Access to these records is not available. Your property manager may need to enable this feature or publish its access rules."
          : code === "failed-precondition"
            ? "This list needs a database index. Please ask your property manager to finish database setup."
            : "Check your connection and reload to try again."}
      </p>
      <button
        className="font-medium underline underline-offset-4"
        onClick={() => window.location.reload()}
      >
        Reload page
      </button>
    </div>
  );
}
