export function Brand({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className={`brand ${inverse ? "brand-inverse" : ""}`}>
      <img src="/rentease-mark.svg" alt="" width="42" height="42" />
      {!compact && (
        <div>
          <span className="brand-name">
            Rent<span>Ease</span>
            <span className="brand-dot">.</span>
          </span>
          <span className="brand-caption">A better place to manage home</span>
        </div>
      )}
    </div>
  );
}
