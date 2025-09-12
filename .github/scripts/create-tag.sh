#!/bin/bash
set -euo pipefail

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

if [[ -n "${REPO_TOKEN:-}" ]]; then
    git remote set-url origin "https://x-access-token:${REPO_TOKEN}@github.com/${GITHUB_REPOSITORY}"
    
    echo "::notice::Setting PAT to origin"
fi

get_latest_tag() {
    git tag --list 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1 || echo "v0.2.2"
}

determine_increment() {
    local last_tag="$1"
    local version_bump="${2:-}"
    
    if [[ -n "$version_bump" ]]; then
        case "$version_bump" in
            major|minor|patch) echo "$version_bump" ;;
            *) echo "::error::Invalid VERSION_BUMP: $version_bump" >&2; exit 1 ;;
        esac
        return
    fi
    
    local commits
    commits=$(git log --format="%s" "$last_tag..HEAD" 2>/dev/null || echo "")
    if [[ -z "$commits" ]]; then
        echo "none"
        return
    fi
    
    local increment="patch"
    while IFS= read -r commit_msg; do
        case "$commit_msg" in
            "BREAKING CHANGE:"* | "feat!:"*) 
                increment="major"
                break
                ;;
            "feat:"* | "feat("*) 
                [[ "$increment" != "major" ]] && increment="minor"
                ;;
            "ci:"* | "ci("*) 
                continue
                ;;
        esac
    done <<< "$commits"
    
    echo "$increment"
}

calculate_version() {
    local current_version="$1"
    local increment="$2"
    
    IFS='.' read -r major minor patch <<< "${current_version#v}"
    case "$increment" in
        major) ((major++)); minor=0; patch=0 ;;
        minor) ((minor++)); patch=0 ;;
        patch) ((patch++)) ;;
        *) echo "::error::Invalid increment type: $increment" >&2; exit 1 ;;
    esac
    
    echo "v$major.$minor.$patch"
}

main() {
    local last_tag increment new_tag
    
    last_tag=$(get_latest_tag)

    echo "::notice::Using tag $last_tag"

    increment=$(determine_increment "$last_tag" "${VERSION_BUMP:-}")
    
    if [[ "$increment" == "none" ]]; then
        echo "No commits since $last_tag, skipping"
        exit 0
    fi
    
    new_tag=$(calculate_version "$last_tag" "$increment")
    
    if git tag --list | grep -q "^${new_tag}$"; then
        echo "Tag $new_tag already exists, skipping"
        exit 0
    fi
    
    git tag "$new_tag"

    git push origin "$new_tag"

    echo "::notice::Pushed tag $new_tag"
    
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        echo "tag=$new_tag" >> "$GITHUB_OUTPUT"
        echo "version=${new_tag#v}" >> "$GITHUB_OUTPUT"
    fi
}

main