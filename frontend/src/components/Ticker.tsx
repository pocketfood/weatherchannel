type TickerProps = {
  items: string[];
};

export default function Ticker({ items }: TickerProps) {
  const message = items.length
    ? items.join('  ***  ')
    : 'Initializing data feed...';

  return (
    <div className="ticker">
      <div className="ticker-track">
        <span>{message}</span>
        <span aria-hidden="true">{message}</span>
      </div>
    </div>
  );
}
