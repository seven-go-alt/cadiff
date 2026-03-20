"""
git_provider.py — Fetch raw Excel file bytes from GitHub or GitLab URLs.

Supports:
  - GitHub blob URL:  https://github.com/owner/repo/blob/<ref>/path/to/file.xlsx
  - GitLab blob URL:  https://gitlab.com/owner/repo/-/blob/<ref>/path/to/file.xlsx
  - Any direct raw / download URL (passed through as-is)

Usage:
    bytes_content = await fetch_file(url, token="ghp_...")
"""

from __future__ import annotations

import re
import httpx


# Patterns for well-known blob URLs → raw URL
_GITHUB_BLOB = re.compile(
    r"^https?://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)$"
)
_GITLAB_BLOB = re.compile(
    r"^https?://gitlab\.com/([^/]+(?:/[^/]+)*)/([^/]+)/-/blob/([^/]+)/(.+)$"
)


def _to_raw_url(url: str) -> tuple[str, str | None]:
    """
    Convert a blob UI URL to a raw download URL.
    Returns (raw_url, host_hint) where host_hint is "github"|"gitlab"|None.
    """
    m = _GITHUB_BLOB.match(url)
    if m:
        owner, repo, ref, path = m.groups()
        raw = f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}"
        return raw, "github"

    m = _GITLAB_BLOB.match(url)
    if m:
        # gitlab.com groups can have subgroups; repo is the last segment
        # e.g. https://gitlab.com/group/sub/repo/-/blob/main/file.xlsx
        # The regex captures everything before /-/blob as namespace+repo
        full_path, _repo, ref, path = m.groups()
        raw = f"https://gitlab.com/{full_path}/{_repo}/-/raw/{ref}/{path}"
        return raw, "gitlab"

    # Already a direct/raw URL
    return url, None


def _build_headers(host_hint: str | None, token: str | None) -> dict[str, str]:
    headers: dict[str, str] = {"User-Agent": "xlsx-diff/0.1"}
    if not token:
        return headers

    if host_hint == "github":
        headers["Authorization"] = f"Bearer {token}"
        headers["Accept"] = "application/vnd.github.v3.raw"
    elif host_hint == "gitlab":
        headers["PRIVATE-TOKEN"] = token
    else:
        # Unknown host — try both common patterns; prefer Bearer
        headers["Authorization"] = f"Bearer {token}"

    return headers


async def fetch_file(url: str, token: str | None = None) -> bytes:
    """
    Download a file from a GitHub/GitLab blob URL or any raw URL.
    Raises httpx.HTTPStatusError on non-2xx responses.
    """
    raw_url, host_hint = _to_raw_url(url)
    headers = _build_headers(host_hint, token)

    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        response = await client.get(raw_url, headers=headers)
        response.raise_for_status()
        return response.content
