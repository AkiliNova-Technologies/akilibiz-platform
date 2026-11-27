#!/usr/bin/env node
// One-way codemod: replaces hard-coded English on web screens with the desktop
// translation key that has exactly that English, so the web follows the
// desktop's language choice (en-UG, lg-UG, sw-UG) like the desktop does.
//
//   node scripts/adopt-desktop-wording.mjs [--dry] [files...]
//
// Only user-visible text is touched: JSX text, JSX attribute strings, string
// branches inside JSX expressions, toast messages and label-like object
// properties. Text is replaced only inside a React component or hook, which
// gets `const { t } = useI18n();` (client) or `await getI18n()` (async server
// component). Prefers the key the matching desktop screen uses.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const desktop = resolve(process.env.AKILIBIZ_DESKTOP_REPO ?? resolve(here, "../../../../akilibiz"));
const dry = process.argv.includes("--dry");

const dictionary = Object.fromEntries(
  [...readFileSync(resolve(desktop, "src/i18n/en-UG.ts"), "utf8")
    .matchAll(/^\s+"([^"]+)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/gm)].map((m) => [m[1], JSON.parse(`"${m[2]}"`)]),
);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
}
const desktopSource = walk(resolve(desktop, "src")).map((f) => readFileSync(f, "utf8")).join("\n");
const keyUse = (text) => new Set([...text.matchAll(/\bt\(\s*["']([a-zA-Z0-9_.-]+)["']/g)].map((m) => m[1]));
const usedOnDesktop = keyUse(desktopSource);

// Desktop screen per web route, to prefer that screen's keys.
const parity = readFileSync(resolve(web, "scripts/ui-parity-report.mjs"), "utf8");
const screens = Object.fromEntries([...parity.matchAll(/(\w+Page): "([^"]*)"/g)].map((m) => [m[2], m[1]]));
const screenKeys = {};
for (const [route, screen] of Object.entries(screens)) {
  const file = resolve(desktop, "src/app/dashboard", `${screen}.tsx`);
  if (existsSync(file)) screenKeys[route] = keyUse(readFileSync(file, "utf8"));
}

const byEnglish = new Map();
for (const [key, english] of Object.entries(dictionary)) {
  if (/\{\{/.test(english) || !usedOnDesktop.has(key) || english.trim() !== english || english.length < 2) continue;
  if (!byEnglish.has(english)) byEnglish.set(english, []);
  byEnglish.get(english).push(key);
}
function keyFor(english, route) {
  const keys = byEnglish.get(english);
  if (!keys) return null;
  const preferred = route !== null && screenKeys[route] ? keys.find((k) => screenKeys[route].has(k)) : undefined;
  return preferred ?? keys[0];
}

const LABEL_PROPS = new Set(["label", "title", "description", "placeholder", "header", "emptyMessage",
  "message", "searchPlaceholder", "tooltip", "helperText", "emptyTitle", "emptyDescription", "subtitle"]);
const NON_TEXT_ATTRS = new Set(["className", "id", "key", "href", "type", "name", "value", "variant", "size",
  "side", "align", "htmlFor", "role", "src", "method", "action", "autoComplete", "inputMode", "pattern",
  "mode", "entity", "kind", "view", "status", "tab", "orientation", "defaultValue", "form", "target", "rel", "dir", "lang", "accept", "data-testid"]);

const isComponentName = (name) => /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
function functionName(node) {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isVariableDeclaration(node.parent) &&
      ts.isIdentifier(node.parent.name)) return node.parent.name.text;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isCallExpression(node.parent) &&
      /^(forwardRef|memo|React\.forwardRef|React\.memo)$/.test(node.parent.expression.getText()) &&
      ts.isVariableDeclaration(node.parent.parent) && ts.isIdentifier(node.parent.parent.name)) return node.parent.parent.name.text;
  return null;
}
function enclosingComponent(node) {
  let found = null;
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isFunctionLike(n)) {
      const name = functionName(n);
      if (name && isComponentName(name)) found = n; // outermost component wins
    }
  }
  return found;
}
function isVisible(node) {
  const p = node.parent;
  if (ts.isJsxText(node)) return true;
  if (ts.isJsxAttribute(p)) return !NON_TEXT_ATTRS.has(p.name.getText()) && !p.name.getText().startsWith("on");
  // "x" inside {cond ? "a" : "b"} or {value ?? "x"} rendered in JSX or an attribute
  let n = node;
  while (ts.isConditionalExpression(n.parent) || ts.isParenthesizedExpression(n.parent) ||
         (ts.isBinaryExpression(n.parent) && ["??", "||"].includes(n.parent.operatorToken.getText()) && n.parent.right === n)) {
    if (ts.isConditionalExpression(n.parent) && n.parent.condition === n) return false;
    n = n.parent;
  }
  if (n !== node && ts.isJsxExpression(n.parent)) {
    const attr = n.parent.parent;
    return !ts.isJsxAttribute(attr) || (!NON_TEXT_ATTRS.has(attr.name.getText()) && !attr.name.getText().startsWith("on"));
  }
  if (ts.isJsxExpression(p)) return !ts.isJsxAttribute(p.parent) || (!NON_TEXT_ATTRS.has(p.parent.name.getText()) && !p.parent.name.getText().startsWith("on"));
  if (ts.isPropertyAssignment(n.parent) && n.parent.initializer === n && LABEL_PROPS.has(n.parent.name.getText())) return true;
  if (ts.isCallExpression(n.parent) && n.parent.arguments[0] === n &&
      /^toast(\.(success|error|info|warning|message))?$/.test(n.parent.expression.getText())) return true;
  if (ts.isPropertyAssignment(n.parent) && n.parent.name.getText() === "description" &&
      ts.isObjectLiteralExpression(n.parent.parent) && ts.isCallExpression(n.parent.parent.parent) &&
      /^toast/.test(n.parent.parent.parent.expression.getText())) return true;
  return false;
}

const HOOKS = new Set(["useMemo", "useCallback", "useEffect", "useLayoutEffect"]);
function routeOf(file) {
  const rel = relative(resolve(web, "app/(app)/dashboard"), dirname(file));
  return rel.startsWith("..") ? null : rel;
}

function transform(file) {
  const text = readFileSync(file, "utf8");
  if (text.includes("GENERATED from the AkiliBiz Desktop")) return null;
  const isClient = /^(\s*\/\/[^\n]*\n)*\s*["']use client["']/.test(text);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const route = routeOf(file);
  const edits = [];
  const components = new Set();
  const depArrays = new Map();
  // A local fake `t` imported from a data module is replaced by the real one.
  let fakeImport = null;
  sf.forEachChild((node) => {
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) &&
        !/i18n/.test(node.moduleSpecifier.getText())) {
      const spec = node.importClause.namedBindings.elements.find((e) => e.name.text === "t" && !e.propertyName);
      if (spec) fakeImport = spec;
    }
  });
  const hasOwnT = (fn) => /\bconst \{[^}]*\bt\b[^}]*\} = (await getI18n|useI18n)\(/.test(fn.getText());

  function visit(node) {
    let english = null;
    if (ts.isJsxText(node)) english = node.text.replace(/\s+/g, " ").trim();
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) english = node.text;
    // A lone lowercase word in a string ("products", "supplier") is usually a value, not text.
    if (english && !ts.isJsxText(node) && /^[a-z]+$/.test(english)) english = null;
    if (english && byEnglish.has(english) && isVisible(node)) {
      const component = enclosingComponent(node);
      const asyncOk = component && (isClient || (component.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword));
      const key = keyFor(english, route);
      if (component && asyncOk && key && ts.isBlock(component.body)) {
        components.add(component);
        if (ts.isJsxText(node)) {
          const raw = node.getText();
          const lead = raw.length - raw.trimStart().length;
          const start = node.getStart() + lead;
          edits.push([start, start + raw.trim().length, `{t("${key}")}`]);
        } else {
          const inAttr = ts.isJsxAttribute(node.parent);
          edits.push([node.getStart(), node.getEnd(), inAttr ? `{t("${key}")}` : `t("${key}")`]);
        }
        // Add t to the dependency list of an enclosing memo/callback/effect.
        for (let n = node.parent; n && n !== component; n = n.parent) {
          if (ts.isCallExpression(n) && HOOKS.has(n.expression.getText()) && n.arguments[1] &&
              ts.isArrayLiteralExpression(n.arguments[1]) &&
              !n.arguments[1].elements.some((e) => e.getText() === "t")) depArrays.set(n.arguments[1].getStart(), n.arguments[1]);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (fakeImport) {
    // Components calling the fake t need the real one too.
    const calls = [];
    (function find(node) {
      if (ts.isCallExpression(node) && node.expression.getText() === "t") calls.push(node);
      ts.forEachChild(node, find);
    })(sf);
    for (const call of calls) { const c = enclosingComponent(call); if (c && ts.isBlock(c.body)) components.add(c); }
  }
  if (!edits.length && !fakeImport) return null;
  for (const arr of depArrays.values()) {
    const close = arr.getEnd() - 1;
    edits.push([close, close, arr.elements.length ? ", t" : "t"]);
  }
  for (const component of components) {
    if (hasOwnT(component)) continue;
    const brace = component.body.getStart() + 1;
    edits.push([brace, brace, isClient ? "\n  const { t } = useI18n();" : "\n  const { t } = await getI18n();"]);
  }
  if (fakeImport) {
    const elements = fakeImport.parent.elements;
    const index = elements.indexOf(fakeImport);
    const end = index < elements.length - 1 ? elements[index + 1].getStart() : fakeImport.getEnd();
    const start = index < elements.length - 1 ? fakeImport.getStart() : elements[index - 1]?.getEnd() ?? fakeImport.getStart();
    edits.push([start, end, ""]);
  }
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = text;
  for (const [start, end, replacement] of edits) out = out.slice(0, start) + replacement + out.slice(end);
  const importLine = isClient
    ? 'import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";'
    : 'import { getI18n } from "@/lib/i18n/server";';
  if (!out.includes(importLine) && /\bt\(/.test(out)) {
    const imports = [...out.matchAll(/^import [\s\S]*?from ["'][^"']+["'];?\s*$/gm)];
    const last = imports.at(-1);
    const at = last ? last.index + last[0].length : 0;
    out = out.slice(0, at) + "\n" + importLine + out.slice(at);
  }
  return { out, count: edits.length };
}

const targets = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((f) => resolve(f));
const files = targets.length ? targets : [
  ...walk(resolve(web, "app/(app)/dashboard")),
  ...walk(resolve(web, "components/akilibiz")).filter((f) => !/\/(i18n|desktop-port|desktop|desktop-shared)\//.test(f)),
].filter((f) => f.endsWith(".tsx"));
let total = 0;
for (const file of files) {
  const result = transform(file);
  if (!result) continue;
  total += result.count;
  if (!dry) writeFileSync(file, result.out);
  console.log(`${String(result.count).padStart(4)}  ${relative(web, file)}`);
}
console.log(`${total} edits${dry ? " (dry run)" : ""}`);
