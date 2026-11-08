import { useEffect, useState } from "react";
import { useReduxAuth } from "@/hooks/useReduxAuth";

export default function AppBootstrap({
  children,
  onReady,
}: {
  children: React.ReactNode;
  onReady?: () => void;
}) {
  const { checkAuth } = useReduxAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const boot = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error("Bootstrap error:", error);
      } finally {
        setReady(true);
        onReady?.();
      }
    };

    boot();
  }, [checkAuth, onReady]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}