BEGIN;
-- MDS-79 : titre du parcours en noir souligne de sa couleur ; nom du patient borne au rond.
-- #7c3aed : violet en dur des copies anterieures au jeton de couleur.
-- Seuls les elements encore a leur valeur d'origine sont touches : une couverture retouchee reste telle quelle.
CREATE FUNCTION "_pdf_couverture_mds79"(contenu JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_set(contenu, '{pages}', (
    SELECT jsonb_agg(
      CASE WHEN page->>'id' = 'cover' AND page->>'kind' = 'canvas' AND jsonb_typeof(page->'elements') = 'array'
        THEN jsonb_set(page, '{elements}', COALESCE((
          SELECT jsonb_agg(x.el ORDER BY x.rang, x.sous_rang)
          FROM (
            SELECT
              CASE
                WHEN el->>'id' = 'cover-program' AND (el->'color'->>'token' = 'pathway.color' OR el->>'color' = '#7c3aed')
                  THEN el || '{"color": "#000000"}'::JSONB
                WHEN el->>'id' = 'cover-patient' AND (el->>'w')::NUMERIC > 300
                  THEN el || '{"w": 240}'::JSONB
                ELSE el
              END AS el, rang, 0 AS sous_rang
            FROM jsonb_array_elements(page->'elements') WITH ORDINALITY AS e(el, rang)
            UNION ALL
            SELECT jsonb_build_object(
                'id', 'cover-program-underline', 'kind', 'rect',
                'x', 237.64, 'y', 483, 'w', 120, 'h', 4,
                'fill', '{"token": "pathway.color", "fallback": "#7c3aed"}'::JSONB
              ), rang, 1
            FROM jsonb_array_elements(page->'elements') WITH ORDINALITY AS e(el, rang)
            WHERE el->>'id' = 'cover-program' AND (el->'color'->>'token' = 'pathway.color' OR el->>'color' = '#7c3aed')
              AND NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(page->'elements') AS d(el2)
                WHERE el2->>'id' = 'cover-program-underline'
              )
          ) AS x
        ), '[]'::JSONB))
        ELSE page
      END ORDER BY rang_page)
    FROM jsonb_array_elements(contenu->'pages') WITH ORDINALITY AS p(page, rang_page)
  ))
$$;

UPDATE "PdfDesign" SET "content" = "_pdf_couverture_mds79"("content")
WHERE jsonb_typeof("content"->'pages') = 'array' AND jsonb_array_length("content"->'pages') > 0;
UPDATE "PdfDesignPreset" SET "content" = "_pdf_couverture_mds79"("content")
WHERE jsonb_typeof("content"->'pages') = 'array' AND jsonb_array_length("content"->'pages') > 0;

DROP FUNCTION "_pdf_couverture_mds79"(JSONB);
COMMIT;
