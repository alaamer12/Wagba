# Tech

How Wagba is built. Everything a user cannot see.

| File                                         | Read it for                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [architecture.md](architecture.md)           | Stack, system shape, app layering, anonymous identity, environments, configuration               |
| [structure.md](structure.md)                 | Folder authority, boundary prohibitions, the authority table, named absences                    |
| [dev-loop.md](dev-loop.md)                   | The three channels, rebuild boundaries, browser-as-device, troubleshooting                      |
| [data-model.md](data-model.md)               | Collections, fields, indexes, access rules, search normalization, migrations                     |
| [identity.md](identity.md)                   | Handle derivation, the transliteration table, deterministic avatar assembly, part-set versioning |
| [discovery.md](discovery.md)                 | The nearby query, the distance math, coordinate privacy, the location buffer, offline behavior   |
| [integrations.md](integrations.md)           | WhatsApp handoff, photos, GPS, share and rate                                                    |
| [conventions.md](conventions.md)             | Biome, Vue and Pinia patterns, i18n and RTL rules, naming, the definition of done                |
| [build-and-release.md](build-and-release.md) | Local setup on Windows and Linux, Railway deployment, Android and iOS builds, rollback           |

**Reading order:** architecture → data-model → discovery, then the rest as needed. Discovery depends on data-model; both assume the shape in architecture.

**Where to go instead.** What the app should _do_ is [../product/](../product/). What it looks like and says is [../design/](../design/). Why a contested choice went the way it did, with the measurements behind it, is [../decisions.md](../decisions.md).

These documents describe the current design, not the code that will implement it. When they disagree, the code is right and this directory is stale — fix the document in the same change that fixed the behavior.
