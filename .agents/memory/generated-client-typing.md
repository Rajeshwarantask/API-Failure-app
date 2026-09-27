---
name: Generated client typing
description: A TypeScript library setting required by generated API client fetch helpers.
---

Generated API client code can call `Headers.entries()`. Any library package compiling that generated code must include both `dom` and `dom.iterable` in its TypeScript `lib` list.

**Why:** Without `dom.iterable`, code generation succeeds but the workspace library typecheck fails even though the generated client is otherwise valid.

**How to apply:** If generated fetch helpers report that `Headers.entries` does not exist, check the compiling package's TypeScript `lib` settings before changing generated output.