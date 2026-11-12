import { useEffect, useRef } from "react";
import type { SceneLabels, Variant } from "./trameScene";

// Three.js n'est chargé qu'après l'affichage : la page pré-rendue reste légère.
export default function Trame({
  variant,
  label,
  labels,
  className = "",
}: {
  variant: Variant;
  label: string;
  labels?: SceneLabels;
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
          dispose = mount(host, variant, labels);
        }
      })
      // Sans WebGL, la scène reste vide : elle est décorative.
      .catch(() => {});
    return () => {
      cancelled = true;
      dispose();
    };
  }, [variant, labels]);

  return <div ref={ref} role="img" aria-label={label} className={className} />;
}
