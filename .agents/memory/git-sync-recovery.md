---
name: GitHub history recovery
description: Recovery guidance when the GitHub default branch has been replaced by an unrelated upload history.
---

When a GitHub default branch has no common ancestor with the local project, preserve the local and remote states before reconciling. Prefer the authenticated GitHub connection when the command-line credential is stale or rejected.

**Why:** A repository can remain healthy while its default branch is replaced through a fresh upload, producing a generic Git divergence error. A blind force-push risks deleting the only copy of the remote snapshot.

**How to apply:** Keep a local recovery reference and a remote backup reference, then publish the current project tree as a normal child of the remote tip. Verify that the local branch tracks the new remote commit and is clean before finishing.