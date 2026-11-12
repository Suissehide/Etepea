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

  // L'enveloppe porte la mise en page, l'intérieur sert de repère aux étiquettes.
  return (
    <div role="img" aria-label={label} className={className}>
      <div ref={ref} className="relative size-full" />
    </div>
  );
}
