// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

package utils

import (
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"
)

// Node represents a file or directory in the tree.
type Node struct {
	Name     string  // base name of the entry
	Path     string  // full logical path within fs
	IsDir    bool    // true if directory
	Children []*Node // child entries (only for directories)
}

// Build builds a tree of nodes starting from basePath within the provided fs.FS.
// basePath can be "." for root or a subdirectory that exists in fs.FS.
// The returned Node is the root representing basePath.
func Build(fsys fs.FS, basePath string) (*Node, error) {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		basePath = "."
	}

	// Stat basePath to ensure it exists; WalkDir will error otherwise.
	if _, err := fs.Stat(fsys, basePath); err != nil {
		return nil, fmt.Errorf("base path %q not found in filesystem: %w", basePath, err)
	}

	root := &Node{Name: basePath, Path: basePath, IsDir: true}
	index := map[string]*Node{
		basePath: root,
	}

	err := fs.WalkDir(fsys, basePath, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return fmt.Errorf("walk error at %q: %w", p, err)
		}

		// Skip the root itself (already created)
		if p == basePath {
			return nil
		}

		// Ensure parent exists in index and create missing parents if needed.
		parentPath := parentFrom(p, basePath)
		if _, ok := index[parentPath]; !ok {
			buildParents(index, parentPath, basePath)
		}

		n := &Node{
			Name:  path.Base(p),
			Path:  p,
			IsDir: d.IsDir(),
		}
		index[p] = n
		index[parentPath].Children = append(index[parentPath].Children, n)
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Stable order: directories first, then files; alphabetical by name.
	sortTree(root)
	return root, nil
}

// Print writes an ASCII tree to stdout starting at node.
// Example:
// root
// ├── dir1
// │   └── file.txt
// └── README.md
func Print(n *Node) {
	if n == nil {
		return
	}
	fmt.Println(n.Name)
	printChildren(n.Children, "")
}

// PrintPath prints a subtree for a specific basePath by calling Build and then Print.
func PrintPath(fsys fs.FS, basePath string) error {
	tree, err := Build(fsys, basePath)
	if err != nil {
		return err
	}
	Print(tree)
	return nil
}

// Helpers

func printChildren(children []*Node, prefix string) {
	for i, c := range children {
		isLast := i == len(children)-1
		var branch string
		var nextPrefix string
		if isLast {
			branch = "└── "
			nextPrefix = prefix + "    "
		} else {
			branch = "├── "
			nextPrefix = prefix + "│   "
		}
		fmt.Printf("%s%s%s\n", prefix, branch, c.Name)
		if c.IsDir && len(c.Children) > 0 {
			printChildren(c.Children, nextPrefix)
		}
	}
}

func sortTree(n *Node) {
	if n == nil || len(n.Children) == 0 {
		return
	}
	sort.Slice(n.Children, func(i, j int) bool {
		di, dj := n.Children[i].IsDir, n.Children[j].IsDir
		if di != dj {
			return di && !dj
		}
		return strings.ToLower(n.Children[i].Name) < strings.ToLower(n.Children[j].Name)
	})
	for _, c := range n.Children {
		sortTree(c)
	}
}

func parentFrom(p, base string) string {
	dir := path.Dir(p)
	// WalkDir returns "." for files at root when base is "."
	if dir == "." {
		return base
	}
	// Ensure parent stays anchored under base for consistent indexing
	if base != "." && !strings.HasPrefix(dir, base) {
		return base
	}
	return dir
}

func buildParents(index map[string]*Node, dir string, base string) {
	// Build missing parent chain from base → dir
	parts := splitPathFromBase(base, dir)
	curPath := base
	curNode := index[base]
	for _, part := range parts {
		nextPath := path.Join(curPath, part)
		if child, ok := index[nextPath]; ok {
			curNode = child
		} else {
			child = &Node{Name: part, Path: nextPath, IsDir: true}
			index[nextPath] = child
			curNode.Children = append(curNode.Children, child)
			curNode = child
		}
		curPath = nextPath
	}
}

func splitPathFromBase(base, target string) []string {
	if target == base {
		return nil
	}
	rel := strings.TrimPrefix(target, base)
	rel = strings.TrimPrefix(rel, "/")
	if rel == "" {
		return nil
	}
	return strings.Split(rel, "/")
}
