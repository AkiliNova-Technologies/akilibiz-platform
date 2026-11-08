import { useEffect, useState } from "react";

export default function AppReveal({
  children,
  onVisible,
}: {
  children: React.ReactNode;
  onVisible?: () => void;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShown(true);
    });

    const timer = setTimeout(() => {
      onVisible?.();
    }, 220);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [onVisible]);

  return (
    <div
      className={`transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}