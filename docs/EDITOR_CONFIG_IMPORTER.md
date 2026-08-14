# Editor configuration importer

The desktop host can inspect Neovim/Vim, Emacs, and Zed configuration metadata
inside an approved project. It returns bounded file summaries and Zed JSON key
names only. Lua, Vimscript, and Emacs Lisp are never evaluated; plugins, LSP,
DAP, shell commands, and credentials are never launched or returned.

Invalid JSON, oversized files, symlinks, and relative project paths are rejected.

```bash
node --test src/main/editor-config-importer.test.js
npm test
```
