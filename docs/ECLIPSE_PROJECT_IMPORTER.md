# Eclipse project importer

SpartanCode can inspect Eclipse project metadata from an approved workspace.
The read-only importer summarizes `.project`, `.classpath`, and Maven/Gradle
marker files without launching Eclipse, Java, OSGi bundles, Maven, or Gradle.

Only bounded XML structure and classpath entry kinds are returned. Paths,
environment values, credentials, plugin configuration, and build execution are
not returned. XML entities/DOCTYPE, malformed or oversized files, and symlinked
metadata are rejected.

```bash
node --test src/main/eclipse-project-importer.test.js
npm test
```
