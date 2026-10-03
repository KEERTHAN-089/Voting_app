import React from 'react';

/*
 * The app's icon set, drawn inline.
 *
 * These replace the Font Awesome stylesheet the pages used to pull from a CDN:
 * the icons now ship with the bundle, so they cannot fail to load, they take
 * their colour from the surrounding text, and there is no render-blocking
 * request on a slow connection.
 *
 * Every path is a 24x24 stroked outline, so they all line up at any size.
 */
const PATHS = {
  ballot: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="m9 11 3 3 9-9" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 5-5" />
    </>
  ),
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4" />
      <path d="M12 14v3M9 20h6M10 17h4l.5 3h-5l.5-3Z" />
    </>
  ),
  barChart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  users: (
    <>
      <path d="M15 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
      <circle cx="8.5" cy="7" r="3.5" />
      <path d="M22 20v-1.5a4 4 0 0 0-3-3.87M16 3.63a4 4 0 0 1 0 7.75" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 8.1 7 9.5 4.1-1.4 7-5.3 7-9.5V6l-7-3Z" />
      <path d="m9.2 12 2 2 3.6-3.6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3 7 8.1 5.6a1.6 1.6 0 0 0 1.8 0L21 7" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a4 4 0 0 0 5.7.4l3-3a4 4 0 0 0-5.7-5.7L11.3 6.4" />
      <path d="M14 11a4 4 0 0 0-5.7-.4l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M17 3.5a2.1 2.1 0 0 1 3 3L8 18.5l-4 1 1-4Z" />
      <path d="m15 5.5 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M3.5 6h17M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
      <path d="M6 6v13.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V6M10 11v5M14 11v5" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  arrowRight: <path d="M4 12h15m0 0-6-6m6 6-6 6" />,
  arrowLeft: <path d="M20 12H5m0 0 6-6m-6 6 6 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  logOut: <path d="M15 17v1.5A1.5 1.5 0 0 1 13.5 20h-8A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V7M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  )
};

/*
 * Decorative by default: an icon that sits next to its own label is hidden from
 * screen readers so the label is not announced twice. Pass `label` for the rare
 * icon that carries meaning on its own, and it becomes an image with a name.
 */
const Icon = ({ name, label, size = 20, className = '', strokeWidth = 1.9 }) => {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {path}
    </svg>
  );
};

export default Icon;
