BEGIN;
-- MDS-79, suite : rond 380 -> 420, nom du patient 32 -> 28 pt dans une boite de 270, toujours ancre a 48 du bas.
-- Seuls les elements encore a leur valeur precedente sont touches.
CREATE FUNCTION "_pdf_couverture_rond"(contenu JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_set(contenu, '{pages}', (
    SELECT jsonb_agg(
      CASE WHEN page->>'id' = 'cover' AND page->>'kind' = 'canvas' AND jsonb_typeof(page->'elements') = 'array'
        THEN jsonb_set(page, '{elements}', COALESCE((
          SELECT jsonb_agg(
            CASE
              WHEN el->>'id' = 'cover-circle' AND (el->>'w')::NUMERIC = 380 AND (el->>'h')::NUMERIC = 380
                THEN el || jsonb_build_object('w', 420, 'h', 420, 'y', (el->>'y')::NUMERIC - 40)
              WHEN el->>'id' = 'cover-patient' AND (el->>'fontSize')::NUMERIC = 32 AND (el->>'w')::NUMERIC = 240
                THEN el || jsonb_build_object('fontSize', 28, 'w', 270, 'h', 68, 'y', (el->>'y')::NUMERIC + 10)
              ELSE el
            END ORDER BY rang)
          FROM jsonb_array_elements(page->'elements') WITH ORDINALITY AS e(el, rang)
        ), '[]'::JSONB))
        ELSE page
      END ORDER BY rang_page)
    FROM jsonb_array_elements(contenu->'pages') WITH ORDINALITY AS p(page, rang_page)
  ))
$$;

UPDATE "PdfDesign" SET "content" = "_pdf_couverture_rond"("content")
WHERE jsonb_typeof("content"->'pages') = 'array' AND jsonb_array_length("content"->'pages') > 0;
UPDATE "PdfDesignPreset" SET "content" = "_pdf_couverture_rond"("content")
WHERE jsonb_typeof("content"->'pages') = 'array' AND jsonb_array_length("content"->'pages') > 0;

DROP FUNCTION "_pdf_couverture_rond"(JSONB);
COMMIT;
