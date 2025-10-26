#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2025  Bruno Bernard

"""
SPDX Header Manager
-------------------
Automatically adds or updates SPDX license and copyright headers in source files.
Designed for use in pre-commit hooks.

Usage:
    python license.py <license> "<author>" [options]

Examples:
    python license.py GPL-2.0-or-later "John Doe" --check
    python license.py MIT "Jane Smith" --fix --dir src/
    python license.py Apache-2.0 "ACME Corp" --ignore-file .licenseignore --fix
"""

import argparse
import fnmatch
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple, Iterator


@dataclass
class CommentStyle:
    line_prefix: Optional[str] = None
    block_start: Optional[str] = None
    block_end: Optional[str] = None

    def format_single_line(self, text: str) -> str:
        if self.line_prefix:
            return f"{self.line_prefix} {text}"
        return f"# {text}"

    def format_block_header(self, lines: List[str]) -> List[str]:
        if self.block_start and self.block_end:
            formatted = [self.format_single_line(line) for line in lines]
            return [self.block_start] + formatted + [self.block_end]
        return [self.format_single_line(line) for line in lines]


# Common comment styles
COMMENT_STYLE_GROUPS = {
    "hash": CommentStyle(line_prefix="#"),
    "slash": CommentStyle(line_prefix="//"),
    "dash": CommentStyle(line_prefix="--"),
    "quote": CommentStyle(line_prefix='"'),
    "css_block": CommentStyle(block_start="/*", block_end="*/"),
    "html_block": CommentStyle(block_start="<!--", block_end="-->"),
}

EXTENSION_STYLES = {
    **{
        ext: COMMENT_STYLE_GROUPS["hash"]
        for ext in (
            ".sh",
            ".bash",
            ".zsh",
            ".fish",
            ".py",
            ".rb",
            ".pl",
            ".r",
            ".yaml",
            ".yml",
            ".toml",
            ".cmake",
        )
    },
    **{
        ext: COMMENT_STYLE_GROUPS["slash"]
        for ext in (
            ".go",
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".c",
            ".cpp",
            ".cc",
            ".cxx",
            ".h",
            ".hpp",
            ".hh",
            ".hxx",
            ".java",
            ".scala",
            ".kt",
            ".swift",
            ".cs",
            ".rs",
            ".php",
            ".m",
            ".mm",
            ".gradle",
            ".groovy",
            ".scss",
            ".sass",
            ".less",
        )
    },
    **{ext: COMMENT_STYLE_GROUPS["dash"] for ext in (".sql", ".lua", ".hs", ".elm")},
    ".vim": COMMENT_STYLE_GROUPS["quote"],
    ".css": COMMENT_STYLE_GROUPS["css_block"],
    **{ext: COMMENT_STYLE_GROUPS["html_block"] for ext in (".html", ".xml", ".svg")},
}

SPECIAL_FILES = {
    "Dockerfile": COMMENT_STYLE_GROUPS["hash"],
    "Makefile": COMMENT_STYLE_GROUPS["hash"],
    "Jenkinsfile": COMMENT_STYLE_GROUPS["slash"],
    "Vagrantfile": COMMENT_STYLE_GROUPS["hash"],
    "Rakefile": COMMENT_STYLE_GROUPS["hash"],
    "Gemfile": COMMENT_STYLE_GROUPS["hash"],
    "Podfile": COMMENT_STYLE_GROUPS["hash"],
    "Fastfile": COMMENT_STYLE_GROUPS["hash"],
    "CMakeLists.txt": COMMENT_STYLE_GROUPS["hash"],
}

EXCLUDE_DIRS = {
    ".git",
    ".svn",
    ".hg",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "node_modules",
    "vendor",
    "third_party",
    "venv",
    ".venv",
    "env",
    ".env",
    "build",
    "dist",
    "target",
    "out",
    ".idea",
    ".vscode",
    ".vs",
    "dist",
    "target",
    "out",
    "bin",
    "public/build",
    "public/hot",
    ".air",
}

EXCLUDE_PATTERNS = {
    "*.min.js",
    "*.min.css",
    "*.generated.*",
    "*.pb.go",
    "*.pb.cc",
    "*_pb2.py",
    "*.log",
    "*.lock",
    "*.sum",
    "*.json",
    "*.toml",
    "*.yml",
    "*.yaml",
    "*.md",
    "*.svg",
    "*.sh",
    "LICENSE",
    "NOTICE",
    ".gitkeep",
    ".gitignore",
    ".licenseignore",
    ".go-version",
    "go.mod",
    ".pre-commit-config.yaml",
    ".golangci.yml",
}


class IgnoreRule:
    def __init__(self, pattern: str, negate: bool = False, dir_only: bool = False):
        self.pattern = pattern
        self.negate = negate
        self.dir_only = dir_only


def load_ignore_file(path: Path) -> List[IgnoreRule]:
    rules: List[IgnoreRule] = []
    if not path or not path.exists():
        return rules
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            negate = line.startswith("!")
            dir_only = line.endswith("/")
            pattern = line
            if negate:
                pattern = pattern[1:]
            if dir_only:
                pattern = pattern[:-1]
            rules.append(IgnoreRule(pattern, negate, dir_only))
    return rules


class SPDXHeader:
    """Manages SPDX license headers in files."""

    def __init__(
        self,
        license_id: str,
        author: str,
        year: Optional[str] = None,
        ignore_rules: Optional[List[IgnoreRule]] = None,
    ):
        self.license_id = license_id
        self.author = author
        self.year = year or str(datetime.now().year)
        self.ignore_rules = ignore_rules or []
        self.spdx_pattern = re.compile(
            r"SPDX-License-Identifier:\s*(.+?)(?:\s*(?:-->|\*/|$))"
        )
        self.copyright_pattern = re.compile(
            r"Copyright\s*(?:\(C\)|©)?\s*(\d{4})(?:\s*-\s*(\d{4}))?\s+(.+?)(?:\s*(?:-->|\*/|$))"
        )

    def get_comment_style(self, filepath: Path) -> Optional[CommentStyle]:
        if filepath.name in SPECIAL_FILES:
            return SPECIAL_FILES[filepath.name]
        if filepath.suffix.lower() in EXTENSION_STYLES:
            return EXTENSION_STYLES[filepath.suffix.lower()]
        if not filepath.suffix:
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    first_line = f.readline().strip()
                    if first_line.startswith("#!"):
                        if any(
                            lang in first_line
                            for lang in ("python", "sh", "bash", "ruby")
                        ):
                            return COMMENT_STYLE_GROUPS["hash"]
                        elif any(lang in first_line for lang in ("node", "javascript")):
                            return COMMENT_STYLE_GROUPS["slash"]
            except (IOError, UnicodeDecodeError):
                pass
        return None

    def should_skip_file(self, filepath: Path) -> bool:
        if any(part in EXCLUDE_DIRS for part in filepath.parts):
            return True

        name = filepath.name
        if any(fnmatch.fnmatch(name, pattern) for pattern in EXCLUDE_PATTERNS):
            return True

        try:
            rel_path = str(filepath.relative_to(Path.cwd()))
        except ValueError:
            rel_path = str(filepath)

        skip = False
        for rule in self.ignore_rules:
            matched = (
                fnmatch.fnmatch(rel_path, rule.pattern) or rule.pattern in rel_path
            )
            if matched:
                skip = not rule.negate
        return skip

    def format_header(self, style: CommentStyle) -> List[str]:
        lines = [
            f"SPDX-License-Identifier: {self.license_id}",
            f"Copyright (C) {self.year}  {self.author}",
        ]
        return style.format_block_header(lines)

    def update_copyright_year(self, line: str, style: CommentStyle) -> str:
        match = self.copyright_pattern.search(line)
        if not match:
            return line
        start_year, end_year, author_name = match.groups()
        author_name = author_name.strip()
        if not end_year:
            if start_year != self.year:
                new_text = f"Copyright (C) {start_year}-{self.year}  {author_name}"
            else:
                return line
        else:
            if end_year != self.year:
                new_text = f"Copyright (C) {start_year}-{self.year}  {author_name}"
            else:
                return line
        return style.format_single_line(new_text)

    def process_file(self, filepath: Path, fix: bool = False) -> Tuple[bool, str]:
        style = self.get_comment_style(filepath)
        if not style:
            return False, f"Unsupported file type: {filepath}"

        try:
            lines = filepath.read_text(encoding="utf-8", errors="ignore").splitlines(
                True
            )
        except Exception as e:
            return False, f"Error reading {filepath}: {e}"

        if not lines:
            return False, f"Empty file: {filepath}"

        start_idx = 1 if lines and lines[0].startswith("#!") else 0
        has_spdx = False
        has_copyright = False
        spdx_line_idx = -1
        copyright_idx = -1

        for i in range(start_idx, min(start_idx + 20, len(lines))):
            line = lines[i]
            if "SPDX-License-Identifier" in line:
                has_spdx = True
                spdx_line_idx = i
            if self.copyright_pattern.search(line):
                has_copyright = True
                copyright_idx = i

        needs_update = False
        new_lines = lines.copy()

        if has_spdx:
            match = self.spdx_pattern.search(lines[spdx_line_idx])
            if match and match.group(1).strip() != self.license_id:
                needs_update = True
                if fix:
                    new_lines[spdx_line_idx] = (
                        style.format_single_line(
                            f"SPDX-License-Identifier: {self.license_id}"
                        )
                        + "\n"
                    )
            if has_copyright:
                updated = self.update_copyright_year(lines[copyright_idx], style)
                if updated != lines[copyright_idx]:
                    needs_update = True
                    if fix:
                        new_lines[copyright_idx] = updated + "\n"
            elif fix:
                new_lines.insert(
                    spdx_line_idx + 1,
                    style.format_single_line(
                        f"Copyright (C) {self.year}  {self.author}"
                    )
                    + "\n",
                )
                needs_update = True
        else:
            needs_update = True
            if fix:
                header_lines = [line + "\n" for line in self.format_header(style)]
                insert_pos = start_idx
                if insert_pos < len(new_lines) and new_lines[insert_pos].strip():
                    header_lines.append("\n")
                new_lines[insert_pos:insert_pos] = header_lines

        if fix and needs_update:
            try:
                filepath.write_text("".join(new_lines), encoding="utf-8")
                return True, f"Updated: {filepath}"
            except Exception as e:
                return False, f"Error writing {filepath}: {e}"

        if needs_update:
            return True, f"Needs update: {filepath}"
        return False, f"OK: {filepath}"


def find_files(root_dir: Path, recursive: bool = True) -> Iterator[Path]:
    yield from (
        (p for p in root_dir.rglob("*") if p.is_file())
        if recursive
        else root_dir.glob("*")
    )


def main():
    parser = argparse.ArgumentParser(
        description="SPDX Header Manager - Add/update license headers"
    )
    parser.add_argument(
        "license", help="SPDX license identifier (e.g., GPL-2.0-or-later)"
    )
    parser.add_argument("author", help="Copyright holder name")
    parser.add_argument(
        "--check", action="store_true", help="Check files without modifying (default)"
    )
    parser.add_argument(
        "--fix", action="store_true", help="Fix files by adding/updating headers"
    )
    parser.add_argument(
        "--dir", type=Path, default=Path("."), help="Root directory to process"
    )
    parser.add_argument("--year", help="Copyright year (default: current year)")
    parser.add_argument(
        "--no-recursive", action="store_true", help="Don't process subdirectories"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Show all files")
    parser.add_argument(
        "--ignore-file",
        type=Path,
        help="Path to ignore file (.licenseignore or .gitignore). By default uses .licenseignore or .gitignore",
    )
    parser.add_argument(
        "files",
        nargs="*",
        type=Path,
        help="Specific files to process (overrides --dir)",
    )
    args = parser.parse_args()

    if args.check and args.fix:
        parser.error("Cannot use both --check and --fix")
    if not args.check and not args.fix:
        args.check = True

    ignore_file = None
    if args.ignore_file and args.ignore_file.exists():
        ignore_file = args.ignore_file
    elif Path(".licenseignore").exists():
        ignore_file = Path(".licenseignore")
    elif Path(".gitignore").exists():
        ignore_file = Path(".gitignore")

    ignore_rules = load_ignore_file(ignore_file)
    manager = SPDXHeader(args.license, args.author, args.year, ignore_rules)

    files_iter = (
        args.files
        if args.files
        else find_files(args.dir, recursive=not args.no_recursive)
    )
    total, updated, errors = 0, 0, 0

    for filepath in files_iter:
        if manager.should_skip_file(filepath):
            continue
        total += 1
        changed, msg = manager.process_file(filepath, fix=args.fix)
        if "Error" in msg:
            errors += 1
        elif changed:
            updated += 1
        if args.verbose or changed or "Error" in msg:
            print(msg)

    print("=" * 60)
    print(f"Total files processed: {total}")
    if args.check:
        print(f"Files needing update: {updated}")
        if updated > 0:
            print("Run with --fix to update headers")
            sys.exit(1)
    else:
        print(f"Files updated: {updated}")
    if errors > 0:
        print(f"Errors: {errors}")
        sys.exit(1)


if __name__ == "__main__":
    main()
