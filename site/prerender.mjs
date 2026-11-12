// Écrit une page HTML complète par URL (contenu et balises), plus sitemap.xml et robots.txt.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { routes, SITE_URL } from "./dist-ssr/entry-server.js";

const template = await readFile("dist/index.html", "utf8");
const HEAD = /<!--head-->[\s\S]*<!--\/head-->/;
const ROOT = '<div id="root"></div>';
if (!HEAD.test(template) || !template.includes(ROOT)) {
  throw new Error("index.html : repères de pré-rendu introuvables");
}

for (const route of routes) {
  const dir = `dist${route.path.replace(/\/$/, "")}`;
  await mkdir(dir, { recursive: true });
  await writeFile(
    `${dir}/index.html`,
    template
      .replace('<html lang="fr">', `<html lang="${route.lang}">`)
      .replace(HEAD, () => route.head)
      .replace(ROOT, () => `<div id="root">${route.html}</div>`),
  );
}

await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${r.url}</loc></url>`).join("\n")}
</urlset>
`,
);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);
await rm("dist-ssr", { recursive: true });
console.log(`${routes.length} pages pré-rendues`);
