#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2025  Bruno Bernard

"""
SPDX Header Manager
-------------------
Automatically adds or updates SPDX license and copyright headers in source files.
Designed for use in pre-commit hooks.

Usage:
    python spdx_header.py <license> "<author>" [options]

Examples:
    python spdx_header.py GPL-2.0-or-later "John Doe" --check
    python spdx_header.py MIT "Jane Smith" --fix --dir src/
"""

import argparse
import fnmatch
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple, Set, Iterator


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
            formatted_lines = [self.format_single_line(line) for line in lines]
            return [self.block_start] + formatted_lines + [self.block_end]
        return [self.format_single_line(line) for line in lines]


COMMENT_STYLE_GROUPS = {
    'hash': CommentStyle(line_prefix='#'),
    'slash': CommentStyle(line_prefix='//'),
    'dash': CommentStyle(line_prefix='--'),
    'quote': CommentStyle(line_prefix='"'),
    'css_block': CommentStyle(block_start='/*', block_end='*/'),
    'html_block': CommentStyle(block_start='<!--', block_end='-->'),
}

EXTENSION_STYLES = {
    **{ext: COMMENT_STYLE_GROUPS['hash'] for ext in (
        '.sh', '.bash', '.zsh', '.fish', '.py', '.rb', '.pl', '.r',
        '.yaml', '.yml', '.toml', '.cmake'
    )},
    **{ext: COMMENT_STYLE_GROUPS['slash'] for ext in (
        '.go', '.js', '.jsx', '.ts', '.tsx', '.c', '.cpp', '.cc', '.cxx',
        '.h', '.hpp', '.hh', '.hxx', '.java', '.scala', '.kt', '.swift',
        '.cs', '.rs', '.php', '.m', '.mm', '.gradle', '.groovy',
        '.scss', '.sass', '.less'
    )},
    **{ext: COMMENT_STYLE_GROUPS['dash'] for ext in ('.sql', '.lua', '.hs', '.elm')},
    '.vim': COMMENT_STYLE_GROUPS['quote'],
    '.css': COMMENT_STYLE_GROUPS['css_block'],
    **{ext: COMMENT_STYLE_GROUPS['html_block'] for ext in ('.html', '.xml', '.svg')},
}

SPECIAL_FILES = {
    'Dockerfile': COMMENT_STYLE_GROUPS['hash'],
    'Makefile': COMMENT_STYLE_GROUPS['hash'],
    'Jenkinsfile': COMMENT_STYLE_GROUPS['slash'],
    'Vagrantfile': COMMENT_STYLE_GROUPS['hash'],
    'Rakefile': COMMENT_STYLE_GROUPS['hash'],
    'Gemfile': COMMENT_STYLE_GROUPS['hash'],
    'Podfile': COMMENT_STYLE_GROUPS['hash'],
    'Fastfile': COMMENT_STYLE_GROUPS['hash'],
    'CMakeLists.txt': COMMENT_STYLE_GROUPS['hash'],
}

SPECIAL_FILE_PATTERNS = {
    "Dockerfile*": COMMENT_STYLE_GROUPS["hash"],
    "*.dockerfile": COMMENT_STYLE_GROUPS["hash"],
}

EXCLUDE_DIRS: Set[str] = {
    '.git', '.svn', '.hg',
    '__pycache__', '.pytest_cache', '.mypy_cache',
    'node_modules', 'vendor', 'third_party',
    'venv', '.venv', 'env', '.env',
    'build', 'dist', 'target', 'out',
    '.idea', '.vscode', '.vs',
}

EXCLUDE_PATTERNS: Set[str] = {
    '*.min.js', '*.min.css',
    '*.generated.*',
    '*.pb.go', '*.pb.cc',
    '*_pb2.py',
}


class SPDXHeader:
    """Manages SPDX license headers in files."""
    
    def __init__(self, license_id: str, author: str, year: Optional[str] = None):
        self.license_id = license_id
        self.author = author
        self.year = year or str(datetime.now().year)
        
        self.spdx_pattern = re.compile(r'SPDX-License-Identifier:\s*(.+?)(?:\s*(?:-->|\*/|$))')
        self.copyright_pattern = re.compile(
            r'Copyright\s*(?:\(C\)|©)?\s*(\d{4})(?:\s*-\s*(\d{4}))?\s+(.+?)(?:\s*(?:-->|\*/|$))'
        )
    
    def get_comment_style(self, filepath: Path) -> Optional[CommentStyle]:
        if filepath.name in SPECIAL_FILES:
            return SPECIAL_FILES[filepath.name]
        
        suffix = filepath.suffix.lower()
        if suffix in EXTENSION_STYLES:
            return EXTENSION_STYLES[suffix]
        
        if not suffix:
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    first_line = f.readline().strip()
                    if first_line.startswith('#!'):
                        if any(lang in first_line for lang in ('python', 'sh', 'bash', 'ruby')):
                            return COMMENT_STYLE_GROUPS['hash']
                        elif any(lang in first_line for lang in ('node', 'javascript')):
                            return COMMENT_STYLE_GROUPS['slash']
            except (IOError, UnicodeDecodeError):
                pass
        
        return None
    
    def should_skip_file(self, filepath: Path) -> bool:
        if any(part in EXCLUDE_DIRS for part in filepath.parts):
            return True
        
        name = filepath.name
        if any(fnmatch.fnmatch(name, pattern) for pattern in EXCLUDE_PATTERNS):
            return True
        
        return False
    
    def _is_text_file(self, filepath: Path) -> bool:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                f.read(512)
            return True
        except (UnicodeDecodeError, IOError):
            return False
    
    def format_header(self, style: CommentStyle) -> List[str]:
        header_lines = [
            f"SPDX-License-Identifier: {self.license_id}",
            f"Copyright (C) {self.year}  {self.author}",
        ]
        if style.block_start and style.block_end:
            return style.format_block_header(header_lines)
        return [style.format_single_line(line) for line in header_lines]
    
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
        
        clean_line = line.lstrip(style.line_prefix).rstrip().lstrip()
        formatted = style.format_single_line(new_text)
        return formatted
    
    def process_file(self, filepath: Path, fix: bool = False) -> Tuple[bool, str]:
        if not self._is_text_file(filepath):
            return False, f"Skipped (binary): {filepath}"
        
        style = self.get_comment_style(filepath)
        if not style:
            return False, f"Unsupported file type: {filepath}"
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
        except Exception as e:
            return False, f"Error reading {filepath}: {e}"
        
        if not lines:
            return False, f"Empty file: {filepath}"
        
        start_idx = 1 if lines and lines[0].startswith('#!') else 0
        
        has_spdx = False
        has_copyright = False
        spdx_line_idx = -1
        copyright_line_idx = -1
        
        for i in range(start_idx, min(start_idx + 20, len(lines))):
            line = lines[i].strip()
            if 'SPDX-License-Identifier' in line:
                has_spdx = True
                spdx_line_idx = i
            if self.copyright_pattern.search(lines[i]):
                has_copyright = True
                copyright_line_idx = i
        
        needs_update = False
        new_lines = lines.copy()
        
        if has_spdx:
            spdx_line = lines[spdx_line_idx]
            current_license_match = self.spdx_pattern.search(spdx_line)
            if current_license_match:
                current_license = current_license_match.group(1).strip()
                if current_license != self.license_id:
                    needs_update = True
                    if fix:
                        new_lines[spdx_line_idx] = style.format_single_line(
                            f"SPDX-License-Identifier: {self.license_id}"
                        ) + '\n'
            
            if has_copyright:
                updated = self.update_copyright_year(lines[copyright_line_idx], style)
                if updated != lines[copyright_line_idx]:
                    needs_update = True
                    if fix:
                        new_lines[copyright_line_idx] = updated + '\n'
            else:
                needs_update = True
                if fix:
                    copyright_line = style.format_single_line(
                        f"Copyright (C) {self.year}  {self.author}"
                    ) + '\n'
                    new_lines.insert(spdx_line_idx + 1, copyright_line)
        else:
            needs_update = True
            if fix:
                header = self.format_header(style)
                header_lines = [line + '\n' for line in header]
                
                insert_pos = start_idx
                if insert_pos < len(new_lines) and new_lines[insert_pos].strip():
                    header_lines.append('\n')
                
                new_lines[insert_pos:insert_pos] = header_lines
        
        if fix and needs_update:
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                return True, f"Updated: {filepath}"
            except Exception as e:
                return False, f"Error writing {filepath}: {e}"
        
        if needs_update:
            return True, f"Needs update: {filepath}"
        
        return False, f"OK: {filepath}"


def find_files(root_dir: Path, recursive: bool = True) -> Iterator[Path]:
    if recursive:
        pattern = '**/*'
    else:
        pattern = '*'
    
    for path in root_dir.glob(pattern):
        if path.is_file():
            yield path


def main():
    parser = argparse.ArgumentParser(
        description='SPDX Header Manager - Add/update license headers',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check files for missing/outdated headers
  %(prog)s GPL-2.0-or-later "John Doe" --check
  
  # Fix all files in src/ directory
  %(prog)s MIT "Jane Smith" --fix --dir src/
  
  # Fix specific files
  %(prog)s Apache-2.0 "ACME Corp" --fix main.py utils.py
  
  # Check with custom year
  %(prog)s BSD-3-Clause "Dev Team" --check --year 2023
        """
    )
    
    parser.add_argument('license', help='SPDX license identifier (e.g., GPL-2.0-or-later)')
    parser.add_argument('author', help='Copyright holder name')
    
    parser.add_argument('--check', action='store_true',
                        help='Check files without modifying (default)')
    parser.add_argument('--fix', action='store_true',
                        help='Fix files by adding/updating headers')
    parser.add_argument('--dir', type=Path, default=Path('.'),
                        help='Root directory to process (default: current)')
    parser.add_argument('--year', help='Copyright year (default: current year)')
    parser.add_argument('--no-recursive', action='store_true',
                        help='Don\'t process subdirectories')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show all files, not just ones needing updates')
    parser.add_argument('files', nargs='*', type=Path,
                        help='Specific files to process (overrides --dir)')
    
    args = parser.parse_args()
    
    if not args.check and not args.fix:
        args.check = True
    
    if args.check and args.fix:
        parser.error('Cannot use both --check and --fix')
    
    manager = SPDXHeader(args.license, args.author, args.year)
    
    if args.files:
        files_iter = iter(args.files)
    else:
        files_iter = find_files(args.dir, recursive=not args.no_recursive)
    
    total_files = 0
    need_update = 0
    errors = 0
    
    for filepath in files_iter:
        if manager.should_skip_file(filepath):
            continue
        
        if not manager.get_comment_style(filepath):
            if args.verbose:
                print(f"Skipped (unsupported): {filepath}")
            continue
        
        total_files += 1
        needs_update, message = manager.process_file(filepath, fix=args.fix)
        
        if 'Error' in message or 'Skipped (binary)' in message:
            errors += 1
            if args.verbose or 'Error' in message:
                print(message)
        elif needs_update:
            need_update += 1
            print(message)
        elif args.verbose:
            print(message)
    
    print(f"\n{'='*60}")
    print(f"Total files processed: {total_files}")
    
    if args.check:
        print(f"Files needing update: {need_update}")
        if need_update > 0:
            print("Run with --fix to update headers")
            sys.exit(1)
    else:
        print(f"Files updated: {need_update}")
        sys.exit(0)
    
    if errors > 0:
        print(f"Errors: {errors}")
        sys.exit(1)
    
    sys.exit(0)


if __name__ == '__main__':
    main()