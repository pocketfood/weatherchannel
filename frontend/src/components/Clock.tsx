import { useEffect, useMemo, useState } from 'react';

export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { timeText, meridiem, dateText } = useMemo(() => {
    const rawTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const [time, suffix] = rawTime.split(' ');
    const rawDate = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return {
      timeText: time,
      meridiem: suffix?.toUpperCase() ?? '',
      dateText: rawDate.replace(/,/g, '').toUpperCase()
    };
  }, [now]);

  return (
    <div className="clock">
      <div className="clock-time">
        <span>{timeText}</span>
        {meridiem && <span className="clock-meridiem">{meridiem}</span>}
      </div>
      <div className="clock-date">{dateText}</div>
    </div>
  );
}
