# Visual Studio project importer

SpartanCode can inspect Visual Studio solution and project metadata from an
approved workspace without launching Visual Studio, MSBuild, a debugger, or a
VSIX. The importer supports `.sln`, `.slnx`, `.csproj`, `.vcxproj`, and `.fsproj`
files and returns only bounded names, paths from solution project entries, XML
root names, and element-name summaries.

It never returns XML values, environment variables, executable paths,
credentials, or project contents. It rejects XML entities/DOCTYPE, malformed or
oversized files, and symlinked metadata. `execution` is always `read-only`.

Focused tests:

```bash
node --test src/main/visual-studio-project-importer.test.js
```

Full verification:

```bash
npm test
```
