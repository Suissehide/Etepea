import { useEffect, useRef } from "react";
import type { Variant } from "./trameScene";

// Three.js n'est chargé qu'après l'affichage : la page pré-rendue reste légère.
export default function Trame({
  variant,
  label,
  className = "",
}: {
  variant: Variant;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) {
      return;
    }
    let dispose = () => {};
    let cancelled = false;
    import("./trameScene")
      .then(({ mount }) => {
        if (!cancelled) {
          dispose = mount(host, variant);
        }
      })
      // Sans WebGL, la scène reste vide : elle est décorative.
      .catch(() => {});
    return () => {
      cancelled = true;
      dispose();
    };
  }, [variant]);

  return <div ref={ref} role="img" aria-label={label} className={className} />;
}
