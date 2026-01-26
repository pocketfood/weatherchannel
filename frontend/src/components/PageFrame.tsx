import { ReactNode } from 'react';
import Clock from './Clock';

type PageFrameProps = {
  title: string;
  location?: string;
  children: ReactNode;
};

export default function PageFrame({ title, location, children }: PageFrameProps) {
  return (
    <section className="page-frame">
      <header className="page-topbar">
        <div className="page-topbar-left">
          <div className="twc-logo" aria-hidden="true">
            <div className="twc-logo-text">THE</div>
            <div className="twc-logo-text">WEATHER</div>
            <div className="twc-logo-text">CHANNEL</div>
          </div>
          <div className="page-title-block">
            {location && <div className="page-location">{location}</div>}
            <div className="page-title">{title}</div>
          </div>
        </div>
        <Clock />
      </header>
      <div className="page-body">{children}</div>
    </section>
  );
}
