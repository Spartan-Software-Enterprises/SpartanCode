# JetBrains project importer

SpartanCode can inspect IntelliJ-family project metadata without installing or
launching a JetBrains IDE. The desktop API accepts only a project inside the
approved workspace and returns bounded metadata with `execution: "read-only"`.

Supported metadata includes `.idea` shared settings, shared run-configuration
names/types, module names/types, and build-system markers for CMake, Gradle,
Maven, and .NET projects. `workspace.xml` and user-specific values are not
imported. Programs, arguments, environment variables, SDK paths, credentials,
plugins, and build tools are never executed or returned.

Product detection is conservative: .NET markers identify Rider, CMake markers
identify CLion, and other `.idea` projects are reported as IntelliJ-family
projects. Detection does not prove an IDE version or native tool availability.

| Fixture | Result |
|---|---|
| `.idea/misc.xml` | Root/component metadata only |
| `.idea/runConfigurations/*.xml` | Configuration name/type only |
| `.idea/workspace.xml` | Ignored as local-only metadata |
| `*.iml` | Module name/type only |
| `CMakeLists.txt` / `CMakePresets.json` | CMake marker |
| `pom.xml` | Maven marker |
| `build.gradle` / `settings.gradle` | Gradle marker |
| `*.sln` / `*.csproj` | Rider/.NET marker |

The importer rejects relative paths, symlinked metadata, XML entities/DOCTYPE,
malformed XML, oversized files, and oversized aggregate input. It has no shell,
network, credential, process, or write capability.

Run the focused tests:

```bash
node --test src/main/jetbrains-project-importer.test.js \
  src/main/adapter-manifest.test.js
```

Run full desktop verification:

```bash
npm test
```
