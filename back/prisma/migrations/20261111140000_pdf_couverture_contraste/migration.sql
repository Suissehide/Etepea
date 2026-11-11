BEGIN;
-- MDS-79, suite : nom du patient noir (blanc sur un parcours fonce), plus de filet sous le titre.
-- Seuls les elements encore a leur valeur d'origine sont touches : une couverture retouchee reste telle quelle.
CREATE FUNCTION "_pdf_couverture_contraste"(contenu JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_set(contenu, '{pages}', (
    SELECT jsonb_agg(
      CASE WHEN page->>'id' = 'cover' AND page->>'kind' = 'canvas' AND jsonb_typeof(page->'elements') = 'array'
        THEN jsonb_set(page, '{elements}', COALESCE((
          SELECT jsonb_agg(
            CASE
              WHEN el->>'id' = 'cover-patient' AND el->>'color' = '#221755'
                THEN el || '{"color": {"token": "pathway.contrast", "fallback": "#e6aff6"}}'::JSONB
              ELSE el
            END ORDER BY rang)
          FROM jsonb_array_elements(page->'elements') WITH ORDINALITY AS e(el, rang)
          WHERE NOT (el->>'id' = 'cover-underline' AND el->>'fill' = '#e05a5a' AND (el->>'w')::NUMERIC = 120)
        ), '[]'::JSONB))
        ELSE page
      END ORDER BY rang_page)
    FROM jsonb_array_elements(contenu->'pages') WITH ORDINALITY AS p(page, rang_page)
  ))
$$;

UPDATE "PdfDesign" SET "content" = "_pdf_couverture_contraste"("content")
WHERE jsonb_typeof("content"->'pages') = 'array' AND jsonb_array_length("content"->'pages') > 0;
UPDATE "PdfDesignPreset" SET "content" = "_pdf_couverture_contraste"("content")
WHERE jsonb_typeof("content"->'pages') = 'array' AND jsonb_array_length("content"->'pages') > 0;

DROP FUNCTION "_pdf_couverture_contraste"(JSONB);
COMMIT;
