#!/usr/bin/env python3
"""Audit a UI source tree against the role/pole rules.

Stdlib only. Framework-agnostic: .tsx .jsx .ts .js .vue .svelte .razor .cs .rs.
Reports findings by code with the reference file that defines the rule.

    python scripts/check_pvc.py src
    python scripts/check_pvc.py . --fail-on warn
    python scripts/check_pvc.py src --explain FACT_SUFFIX_RENDERS
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

# ---------------------------------------------------------------- conventions

UNIT_EXTS = {".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte", ".razor", ".cs", ".rs"}

SKIP_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "bower_components", "dist", "build",
    "out", "bin", "obj", "target", "__pycache__", ".venv", "venv", "coverage",
    ".next", ".nuxt", ".svelte-kit", ".output", "App_Data", "wwwroot/lib",
}

# Directory-name vocabulary. All illustrative, all overridable from the CLI.
PRIMITIVE_DIRS = {"base", "adaptive", "elements", "ui"}
FEATURE_DIRS = {"features", "capabilities", "modules", "domains", "packages"}
TIER_DIRS = {"components", "decorations", "behaviour", "behavior", "views", "hooks",
             "composables", "services", "state", "conditions"}
# The feature-wide pool specifically — what a tier LOCK signals. `views/` is a role
# folder, not a pool, so a `_`-prefixed unit living inside a View folder is judged by
# the consumer test instead (placement.md \u00a73 vs \u00a73.1).
POOL_DIRS = {"components", "decorations", "behaviour", "behavior", "hooks",
             "composables", "services", "conditions", "state"}
PAGE_DIRS = {"pages", "routes", "app"}

# Name suffixes per role.
FACT_SUFFIX = ("State", "Condition")
FACT_SUFFIX_CI = ("state", "condition")
RENDITION_SUFFIX = "Rendition"
VIEW_SUFFIX = "View"

RULES = {
    "FACT_SUFFIX_RENDERS": ("naming.md", "\u00a74",
        "A fact source returns data, never markup. A file named ...State/...Condition "
        "that renders has merged fact and decision into one unit. (Classifying the fact "
        "itself is the /states skill; the naming prohibition is /pvc's.)"),
    "RENDITION_CONSULTS_FACT": ("view-and-rendition.md", "\u00a75",
        "A Rendition receives props only. Consulting a fact source promotes it to a View; "
        "rename it or pass the value in."),
    "RENDITION_SELECTS_SIBLING": ("view-and-rendition.md", "\u00a75",
        "A Rendition must not choose between sibling Renditions \u2014 a case cannot "
        "enumerate its own case-set. The chooser is a View."),
    "REVERSED_PRIMITIVE_DEP": ("primitives-and-imports.md", "\u00a71, \u00a74",
        "A primitive imports feature code. Imports must point downward: "
        "application \u2192 purpose \u2192 primitive."),
    "PRIMITIVE_IS_FEATURE_SPECIFIC": ("primitives-and-imports.md", "\u00a71",
        "A primitive names a feature concept. If it knows what it is for, it is a "
        "Component and belongs in that feature."),
    "TIER_SKIP": ("primitives-and-imports.md", "\u00a72-\u00a73",
        "Consuming ui/base (or the framework control) directly instead of the adaptive "
        "tier. Law 2: imports point downward and never skip."),
    "LOCK_CROSSED": ("placement.md", "\u00a73.1, \u00a75",
        "A feature tier imports another feature's tier. Shared folder names are not a "
        "shared family; no lock crosses between sibling features."),
    "SCOPED_IMPORT_ESCAPE": ("placement.md", "\u00a73, \u00a75",
        "A `_`-prefixed, View-scoped Global-Local unit is imported from outside the "
        "folder of the family it exists to serve."),
    "PAGE_COMPOSES_PRIMITIVES": ("roles.md", "\u00a73, \u00a79",
        "A Page composes Views. Rendering primitives directly means the Page has taken "
        "on a lower role."),
    "VIEW_NO_FACT": ("view-and-rendition.md", "\u00a72",
        "A unit named ...View consults no fact at all. It may be a Component or "
        "Decoration wearing a role suffix."),
    "WRAPPER_SUSPECT": ("composition-shapes.md", "\u00a72-\u00a74",
        "A Component-named unit that only groups siblings with no fact and no own logic "
        "is likely a Wrapper Component. Run the coordination test."),
}

# ------------------------------------------------------------------- patterns

RENDER_EVIDENCE = [
    re.compile(r"return\s*\(?\s*(?:<>|<[A-Za-z/])"),          # JSX return
    re.compile(r"=>\s*\(?\s*<[A-Za-z/]"),                     # arrow returning JSX
    re.compile(r"return\s+[\w.()\s]+\?\s*<[A-Za-z]"),         # ternary branch returning JSX
    re.compile(r"<[A-Za-z][\w.-]*(?:\s[^<>\n]*)?/>"),         # self-closing element
    re.compile(r"</[A-Za-z][\w.-]*>"),                        # closing element
    re.compile(r"<template[\s>]"),                            # Vue/Svelte block
    re.compile(r"rsx!\s*\{"),                                 # Dioxus
    re.compile(r"^\s*<[A-Za-z][\w.-]*(?:\s|/|>|$)", re.M),     # Razor/HTML markup line
    re.compile(r"RenderFragment\s*<"),                        # Razor builder
    re.compile(r"^\s*<(?!/?code)[A-Za-z]", re.M),             # Razor markup outside @code
]

FACT_CALL = [
    re.compile(r"\b(?:use|create)[A-Za-z0-9_]*(?:State|Condition)[A-Za-z0-9_]*\s*(?:\(|<)"),
    re.compile(r"\buse_[a-z0-9_]*(?:state|condition)[a-z0-9_]*\s*\("),
    re.compile(r"@inject\s+(?:[A-Za-z0-9_.]*\b)?[A-Za-z0-9_]*(?:State|Condition)\b"),
    re.compile(r"\b(?:Read|Write)Signal<[^>]*>\s*[A-Za-z0-9_]*(?:state|condition)"),
    re.compile(r"\buse[A-Z][A-Za-z0-9]*Store\s*\("),           # Pinia
    re.compile(r"\buseSelector\s*\("),                         # react-redux
    re.compile(r"\b(?:Global|use_resource|use_signal|use_memo)\s*[<(]"),
    re.compile(r"\buseContext\s*\("),
    re.compile(r"\binject\s*\(\s*[A-Za-z0-9_]*(?:State|Condition)"),  # Vue provide/inject
]

SELECTION = [
    re.compile(r"\bif\s*\("),
    re.compile(r"\belse\s+if\b|\belse\b"),
    re.compile(r"\bv-if\b|\bv-else-if\b"),
    re.compile(r"@if\s*\(|@else"),
    re.compile(r"\bmatch\s*\{"),
    re.compile(r"<Switch\b|<Match\b"),
    re.compile(r"\?\s*<[A-Za-z]"),
]

RE_IMPORT_FROM = re.compile(
    r"""(?:from|import)\s+["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)""")
RE_RAZOR_USING = re.compile(r"@using\s+([A-Za-z0-9_.]+)")
RE_CS_USING = re.compile(r"^\s*using\s+(?:static\s+)?([A-Za-z0-9_.]+)\s*;", re.M)
RE_RUST_USE = re.compile(r"^\s*use\s+(?:crate::|self::|super::)([A-Za-z0-9_:]+)\s*;", re.M)
RE_ALIAS = re.compile(r"^\s*alias\s+(.+)", re.M)          # vite-style, informational

def has_any(patterns, text):
    return any(p.search(text) for p in patterns)

# ------------------------------------------------------------------- discovery

class Unit:
    __slots__ = ("path", "rel", "name", "ext", "text", "lines", "dirs", "is_markup")

    def __init__(self, root, path):
        self.path = path
        self.rel = os.path.relpath(path, root).replace("\\", "/")
        base = os.path.basename(path)
        self.ext = os.path.splitext(base)[1]
        self.name = os.path.splitext(base)[0]
        self.dirs = [d.lower() for d in os.path.dirname(self.rel).split("/") if d]
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as fh:
                self.text = fh.read()
        except OSError:
            self.text = ""
        self.lines = self.text.splitlines()
        self.is_markup = self.ext in {".tsx", ".jsx", ".vue", ".svelte", ".razor", ".rs"}

    @property
    def folder(self):
        return os.path.dirname(self.rel)

    def is_primitive(self):
        return bool({"base", "adaptive", "elements"} & set(self.dirs)) or \
            (bool(self.dirs) and self.dirs[0] == "ui")

    def feature(self):
        for i, d in enumerate(self.dirs):
            if d in FEATURE_DIRS and i + 1 < len(self.dirs):
                return self.dirs[i + 1]
        return None

    def at_feature_tier(self):
        f = self.feature()
        return f is not None and f in self.dirs and any(
            t in TIER_DIRS for t in self.dirs[self.dirs.index(f) + 1:])

    def is_page(self):
        return self.name.endswith(("Page", "page")) or bool(set(self.dirs) & {"pages"})


def discover(root, exclude):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames
                             if d not in SKIP_DIRS
                             and not any(ex.match(os.path.relpath(
                                 os.path.join(dirpath, d), root).replace("\\", "/"))
                                 for ex in exclude))
        for fn in sorted(filenames):
            ext = os.path.splitext(fn)[1]
            if ext not in UNIT_EXTS:
                continue
            path = os.path.join(dirpath, fn)
            if any(ex.match(os.path.relpath(path, root).replace("\\", "/")) for ex in exclude):
                continue
            rel_root = os.path.relpath(dirpath, root).replace("\\", "/")
            u = Unit(root, path)
            u.dirs = [d.lower() for d in ("" if rel_root == "." else rel_root).split("/") if d]
            out.append(u)
    return out

# ------------------------------------------------------------- import resolution

ALIASES = {}

def load_aliases(root):
    """Best-effort: read common alias declarations so @/x resolves to a real folder."""
    for cfg in ("tsconfig.json", "jsconfig.json", "vite.config.ts", "vite.config.js",
                "webpack.config.js", "nuxt.config.ts", "svelte.config.js", ".babelrc.json"):
        path = os.path.join(root, cfg)
        if not os.path.exists(path):
            continue
        try:
            text = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for m in re.finditer(r'"([^""]\*?)"\s*:\s*\["([^""]\*?)"\]', text):
            ALIASES[m.group(1)] = m.group(2)
        for m in re.finditer(r"""(["'])([^"']+)\1\s*:\s*(["'])([^"']+)\3""", text):
            if m.group(2).startswith(("@", "~")):
                ALIASES.setdefault(m.group(2), m.group(4))


def specs_of(unit):
    """(raw specifier, line number) for every import this unit makes."""
    found = []
    for i, line in enumerate(unit.lines, 1):
        if m := RE_IMPORT_FROM.search(line):
            found.append((m.group(1) or m.group(2), i))
        elif unit.ext == ".razor" and (m := RE_RAZOR_USING.search(line)):
            found.append((m.group(1).replace(".", "/"), i))
        elif unit.ext == ".cs" and (m := RE_CS_USING.search(line)):
            found.append((m.group(1).replace(".", "/"), i))
        elif unit.ext == ".rs" and (m := RE_RUST_USE.search(line)):
            found.append((m.group(1), i))
    return found


def resolve(spec, unit, root):
    """Map a specifier to a tree-relative path, or None if external/unresolvable."""
    for alias, target in ALIASES.items():
        a = alias.rstrip("*")
        if spec == a.rstrip("/") or spec.startswith(a.rstrip("/") + "/") or spec.startswith(alias.rstrip("*")):
            if spec.startswith(a):
                spec = target.rstrip("/") + spec[len(a):]
                spec = spec.replace("*", "")
                if not spec.startswith("."):
                    spec = "./" + spec.lstrip("/")
                break
    if spec.startswith("."):
        base = os.path.normpath(os.path.join(unit.folder, spec))
        return base.replace("\\", "/").lstrip("./")
    if spec.startswith(("@/", "~/", "/src/", "src/")):
        return spec.lstrip("@~/").lstrip("/").replace("\\", "/")
    if spec.startswith("crate/") or spec.startswith("self/") or spec.startswith("super/"):
        stem = spec.split("/", 1)[1]
        base = os.path.normpath(os.path.join(os.path.dirname(unit.folder), stem)) \
            if spec.startswith("super/") else stem
        return base.replace("\\", "/")
    return None


def segments(path):
    return [s.lower() for s in path.split("/") if s]


def in_tree(root, rel):
    """Does this resolved specifier point at something that actually exists?

    Locks and dependency direction are established by real imports between real
    files, never by a string that merely looks like a path — an unresolvable
    relative spec must not invent a cross-feature relationship.
    """
    if not rel:
        return False
    base = os.path.join(root, *rel.split("/"))
    if os.path.isdir(base):
        return True
    if os.path.exists(base):
        return True
    stem = os.path.splitext(base)[1]
    if not stem:
        for ext in UNIT_EXTS:
            if os.path.exists(base + ext):
                return True
        for ext in sorted(UNIT_EXTS):
            for leaf in ("index", os.path.basename(base)):
                if os.path.exists(os.path.join(base, leaf + ext)):
                    return True
    return False

# ----------------------------------------------------------------------- checks

def check(root, units, opts):
    findings = []
    by_name = {}
    for u in units:
        by_name.setdefault(u.name, []).append(u)
    fact_re = re.compile(r"\b(?:use|create)[A-Za-z0-9_]*(?:State|Condition)[A-Za-z0-9_]*\s*[\(<]")

    for u in units:
        low = u.name.lower()
        is_fact = low.endswith(FACT_SUFFIX_CI) and not u.name.endswith(VIEW_SUFFIX)
        is_rendition = u.name.endswith(RENDITION_SUFFIX)
        is_view = u.name.endswith(VIEW_SUFFIX)
        consults = has_any(FACT_CALL, u.text) if u.is_markup or u.ext in {".ts", ".js"} else False
        renders = u.is_markup and has_any(RENDER_EVIDENCE, u.text)

        # 1. fact source that renders
        if is_fact and renders:
            line = next((i for i, l in enumerate(u.lines, 1)
                         if has_any(RENDER_EVIDENCE, l)), 1)
            add(findings, "FACT_SUFFIX_RENDERS", u, line,
                "name claims a fact, body returns markup")

        # 2. Rendition consulting a fact
        if is_rendition and consults:
            line = next((i for i, l in enumerate(u.lines, 1) if has_any(FACT_CALL, l)), 1)
            add(findings, "RENDITION_CONSULTS_FACT", u, line,
                "reads a State/Condition source")

        # 3. Rendition selecting between sibling Renditions
        if is_rendition and consults and has_any(SELECTION, u.text):
            sib = [n for n in by_name if n.endswith(RENDITION_SUFFIX) and n != u.name
                   and re.search(rf"<{n}\b|{n}\s*\{{|\b{n}\b", u.text)]
            if len(sib) >= 2:
                add(findings, "RENDITION_SELECTS_SIBLING", u, 1,
                    "branches to " + ", ".join(sorted(sib)[:3]))

        # 4. View naming a unit that consults nothing
        if is_view and u.is_markup and not consults and not opts.quiet:
            add(findings, "VIEW_NO_FACT", u, 1,
                "no fact source consulted; verify it is a View and not a Component", level="warn")

        # 5. Wrapper suspicion
        if not opts.no_wrapper and u.is_markup and not consults and not is_fact \
           and not is_rendition and not is_view and not u.name.startswith("_") \
           and "components" in u.dirs:
            tags = set()
            for s in specs_of(u, ):
                p = resolve(s[0], u, root)
                if p:
                    n = os.path.basename(p)
                    if n in by_name and re.search(rf"<{n}\b|{n}\s*\{{", u.text):
                        tags.add(n)
            if len(tags) >= 2 and not re.search(r"\b(?:useState|createSignal|ref\(|signal\(|use_signal)\b", u.text):
                add(findings, "WRAPPER_SUSPECT", u, 1,
                    "groups %s with no fact of its own" % ", ".join(sorted(tags)), level="warn")

        # 6/7/8. import direction
        my_feature = u.feature()
        for spec, line in specs_of(u):
            p = resolve(spec, u, root)
            target = segments(p) if p else None
            proven = bool(p) and in_tree(root, p)

            if u.is_primitive():
                if proven and target and any(t in FEATURE_DIRS for t in target):
                    add(findings, "REVERSED_PRIMITIVE_DEP", u, line,
                        f"primitive imports {p} from a feature layer")
                if not target and not spec.startswith((".", "@", "~")) and \
                   spec not in ("react", "vue", "svelte", "solid-js") and opts.strict_framework:
                    add(findings, "TIER_SKIP", u, line,
                        f"framework package '{spec}' named outside ui/base", level="warn")

            if target and "base" in target and "ui" in target and not u.is_primitive():
                add(findings, "TIER_SKIP", u, line,
                    f"consumes ui/base ({p}) instead of the adaptive tier")

            # tier lock: a feature importing another feature's tier
            if proven and target and my_feature:
                other = next((t for t in FEATURE_DIRS if t in target), None)
                if other:
                    idx = target.index(other)
                    theirs = target[idx + 1] if idx + 1 < len(target) else None
                    if theirs and theirs != my_feature and any(t in TIER_DIRS for t in target[idx + 1:]):
                        add(findings, "LOCK_CROSSED", u, line,
                            f"imports {theirs}'s tier from {my_feature}: {p}")
                    elif theirs and theirs != my_feature and not any(t in TIER_DIRS for t in target[idx + 1:]):
                        add(findings, "LOCK_CROSSED", u, line,
                            f"imports another feature's implementation: {p}")

                    # _-prefixed scoped unit pulled outside its family folder
                    leaf = os.path.basename(p)
                    if leaf.startswith("_") and theirs == my_feature and \
                       not any(t in POOL_DIRS for t in target[idx + 1:]):
                        home = os.path.dirname(p)
                        if home != u.folder and not u.folder.startswith(home):
                            add(findings, "SCOPED_IMPORT_ESCAPE", u, line,
                                f"'{leaf}' is View-scoped but imported from {u.folder}")

        # 9. primitive naming a feature concept
        if u.is_primitive():
            hits = re.findall(r"\b(?:DeleteAccount|Checkout|Payment|Follow[A-Z]?|Subscription|"
                              r"Invoice|Cart)[A-Za-z0-9_]*", u.text)
            if hits:
                add(findings, "PRIMITIVE_IS_FEATURE_SPECIFIC", u, 1,
                    "names " + ", ".join(sorted(set(hits))[:3]))

        # 10. Page composing primitives
        if u.is_page():
            prim = [n for n in by_name if n in {"Button", "Input", "Icon", "Chip", "Spinner",
                                                "Text", "Avatar", "Select", "Checkbox"}]
            used = [n for n in prim if re.search(rf"<{n}\b|{n}\s*\{{", u.text)]
            if used:
                add(findings, "PAGE_COMPOSES_PRIMITIVES", u, 1,
                    "renders " + ", ".join(sorted(set(used))[:4]), level="warn")

    return findings


def add(findings, code, unit, line, detail, level="error"):
    if opts_only and code not in opts_only:
        return
    findings.append({"code": code, "level": level, "path": unit.rel, "line": line,
                     "detail": detail, "ref": RULES[code][0], "section": RULES[code][1]})

opts_only = set()

# --------------------------------------------------------------------- report

def report(findings, root, as_json, max_lines):
    counts = {}
    for f in findings:
        counts[f["code"]] = counts.get(f["code"], 0) + 1
    errors = sum(1 for f in findings if f["level"] == "error")
    warns = sum(1 for f in findings if f["level"] == "warn")

    if as_json:
        print(json.dumps({"root": root, "errors": errors, "warnings": warns,
                          "findings": sorted(findings, key=lambda f: (f["code"], f["path"]))},
                         indent=2))
        return errors, warns

    if not findings:
        print(f"OK — no findings under {root}")
        return 0, 0

    shown = 0
    for f in sorted(findings, key=lambda x: (x["code"], x["path"], x["line"])):
        if shown >= max_lines:
            print(f"… {len(findings) - shown} more (raise with --max, or narrow with --only)")
            break
        print(f"[{f['level'].upper():5}] {f['path']}:{f['line']}  {f['code']} — {f['detail']}")
        print(f"          rule: references/{f['ref']} {f['section']}")
        shown += 1
    print()
    print("summary:")
    for code, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        lvl = next(f["level"] for f in findings if f["code"] == code)
        print(f"  {n:4}  {code} ({lvl})  — references/{RULES[code][0]}")
    print(f"\n{errors} error(s), {warns} warning(s) under {root}")
    return errors, warns


def explain(codes):
    rc = 0
    for code in codes:
        code = code.upper()
        if code not in RULES:
            print(f"unknown check {code}; known: {', '.join(sorted(RULES))}")
            rc = 2
            continue
        ref, sec, text = RULES[code]
        print(f"{code}\n  rule: references/{ref} {sec}\n  {text}")
    return rc

# -------------------------------------------------------------------------- main

def main(argv=None):
    try:                                  # section signs must survive Windows consoles
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="Audit a UI tree against the role/pole rules.")
    ap.add_argument("root", nargs="?", default="src", help="source root to scan (default: src)")
    ap.add_argument("--only", help="restrict to these check codes (comma separated)")
    ap.add_argument("--exclude", action="append", default=[],
                    help="glob to skip (repeatable), relative to root")
    ap.add_argument("--fail-on", choices=["error", "warn", "never"], default="error")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--quiet", action="store_true", help="skip the advisory VIEW_NO_FACT check")
    ap.add_argument("--no-wrapper", action="store_true", help="skip WRAPPER_SUSPECT")
    ap.add_argument("--strict-framework", action="store_true",
                    help="also flag framework packages imported outside ui/base")
    ap.add_argument("--max", type=int, default=80, help="max findings to print")
    ap.add_argument("--explain", nargs="+", metavar="CODE", help="print the rule for a check and exit")
    ns = ap.parse_args(argv)

    if ns.explain:
        return explain(ns.explain)

    if not os.path.isdir(ns.root):
        print(f"error: no such directory: {ns.root}")
        return 2

    global opts_only
    opts_only = {c.upper() for c in ns.only.split(",")} if ns.only else set()
    unknown = sorted(opts_only - set(RULES))
    if unknown:
        print(f"error: unknown check code(s): {', '.join(unknown)}")
        print(f"known: {', '.join(sorted(RULES))}")
        return 2

    load_aliases(os.path.dirname(os.path.abspath(ns.root)))
    load_aliases(ns.root)

    exclude = [re.compile(glob_to_re(g)) for g in ns.exclude]
    units = discover(ns.root, exclude)
    if not units:
        print(f"OK — no UI source files found under {ns.root} "
              f"(checked extensions: {', '.join(sorted(UNIT_EXTS))})")
        return 0

    findings = check(ns.root, units, ns)
    errors, warns = report(findings, ns.root, ns.json, ns.max)

    if ns.fail_on == "never":
        return 0
    if ns.fail_on == "warn" and warns:
        return 1
    return 1 if errors else 0


def glob_to_re(glob):
    out, i = "", 0
    while i < len(glob):
        c = glob[i]
        if c == "*":
            if glob[i:i + 2] == "**":
                out += ".*"; i += 2; continue
            out += "[^/]*"
        elif c == "?":
            out += "[^/]"
        elif c in ".+^$(){}[]|\\":
            out += "\\" + c
        else:
            out += c
        i += 1
    return "^" + out + "$"


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
