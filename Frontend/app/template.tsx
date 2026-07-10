// Remounts on every route change, replaying a short fade/slide-up so
// navigation feels set rather than hard-cut. Disabled under reduced motion.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
