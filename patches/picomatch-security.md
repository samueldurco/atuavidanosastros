# Temporary picomatch mitigation

GHSA-fc5q-39xc-vjpf was added to the registry audit feed during this release.
The feed suggests 4.0.8, but npm only publishes 4.0.7 as of 2026-11-18.
Upstream advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf

The local 4.0.7 patch uses picomatch's existing fail-closed path for repeated
single-branch extglobs containing a star. Such patterns are treated as literal
text; ordinary path globs and non-wildcard extglobs retain their behavior.
This deliberately restricts wildcard extglob support, including escaped stars
inside that shape, rather than attempting an unreviewed regex rewrite.
The recursion opt-out cannot disable this protection.

CI still queries every registry advisory. `scripts/audit-dependencies.mjs`
recognizes only this exact advisory/version after checking all installed
picomatch dependency references against the patch checksum, verifying the
installed guard, and running attack and normal-glob regressions in a child
process with a hard deadline. Every other advisory or version fails the gate.
No global audit ignore is configured.

When upstream publishes a verified fix, remove this patch and its audit
recognition together, restore the plain audit command, and run the full CI
suite. Until then, the patch and its regression guard must remain coupled.
