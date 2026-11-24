// Static audit: JS syntax, relative imports + named exports, HTML script/css refs, and *.html links used in JS/HTML.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = new URL("..", import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error("FAIL", m);
  bad++;
};
const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return n === "node_modules" || n === ".git"
      ? []
      : statSync(p).isDirectory()
        ? walk(p)
        : [p];
  });
const files = walk(root);
const js = files.filter((f) => f.endsWith(".js")),
  htmls = files.filter((f) => f.endsWith(".html"));
const exportsOf = (src) => {
  const s = new Set();
  for (const m of src.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|class)\s+([\w$]+)/g,
  ))
    s.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g))
    m[1].split(",").forEach((x) =>
      s.add(
        x
          .trim()
          .split(/\s+as\s+/)
          .pop(),
      ),
    );
  return s;
};
for (const f of js) {
  try {
    execFileSync("node", ["--check", f], { stdio: "pipe" });
  } catch (e) {
    fail(`syntax ${f}\n${e.stderr}`);
    continue;
  }
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(
    /import\s+(?:\{([^}]+)\}\s+from\s+)?['"](\.[^'"]+)['"]/g,
  )) {
    const t = resolve(dirname(f), m[2]);
    if (!existsSync(t)) {
      fail(`${f}: missing import ${m[2]}`);
      continue;
    }
    if (m[1]) {
      const ex = exportsOf(readFileSync(t, "utf8"));
      m[1]
        .split(",")
        .map((x) => x.trim().split(/\s+as\s+/)[0])
        .filter(Boolean)
        .forEach((n) => {
          if (!ex.has(n)) fail(`${f}: '${n}' not exported by ${m[2]}`);
        });
    }
  }
  for (const m of src.matchAll(
    /['"`]((?:admin\/)?[\w-]+\.html)(?:\?[^'"`]*)?['"`]/g,
  ))
    if (!existsSync(join(root, m[1]))) fail(`${f}: links to missing ${m[1]}`);
}
for (const f of htmls) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(
    /(?:src|href)="([^"#:]+?\.(?:js|css|html|svg))(?:\?[^"]*)?"/g,
  ))
    if (!existsSync(join(f.includes("/admin/") ? root : dirname(f), m[1])))
      fail(`${f}: missing ${m[1]}`);
}
if (
  existsSync(join(root, "js/config.js")) &&
  /eyJ[A-Za-z0-9_-]{20,}/.test(
    files
      .filter((f) => /\.(js|html)$/.test(f))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n"),
  )
)
  fail("possible hard-coded JWT/key in client code");
console.log(
  bad
    ? `${bad} problem(s)`
    : `OK: ${js.length} JS files, ${htmls.length} HTML pages`,
);
process.exit(bad ? 1 : 0);
