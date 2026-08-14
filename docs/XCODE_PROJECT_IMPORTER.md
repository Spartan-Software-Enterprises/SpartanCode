# Xcode and Swift Package importer

The desktop host can inspect `.xcodeproj`, `.xcworkspace`, and `Package.swift`
metadata from an approved workspace. The importer is read-only and does not
invoke Xcode, SwiftPM, a simulator, schemes, signing, or credentials.

It returns bounded product names, build-configuration counts, workspace
presence, and Swift tools-version metadata. Signing-related project metadata,
symlinks, and oversized inputs are rejected.

```bash
node --test src/main/xcode-project-importer.test.js
npm test
```
