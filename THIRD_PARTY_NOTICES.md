# Third-party notices

This repository separates application source from third-party components and content. The project license, when selected, does not replace the licenses below or grant rights in third-party services, trademarks, artwork or datasets. See `LICENSE-STATUS.md` for the current project-license status.

## Included notices

| Material | Notice included in this repository | Scope |
| --- | --- | --- |
| shadcn/ui | `vendor/shadcn-tailwind-4.13.0.LICENSE.md` | MIT; retain for the vendored Tailwind stylesheet and any retained shadcn-derived UI component source |
| HeroUI React 3.2.6 | `public/licenses/heroui-react-3.2.6.txt` | Exact shipped Apache-2.0 LICENSE; package metadata declares MIT |
| HeroUI Styles 3.2.6 | `public/licenses/heroui-styles-3.2.6.txt` | Exact shipped Apache-2.0 LICENSE; package metadata declares MIT |
| Motion 14.1.0 | `public/licenses/motion-14.1.0.txt` | Motion MIT notice |
| Lucide React 1.31.0 | `public/licenses/lucide-react-1.31.0.txt` | Complete ISC notice plus the MIT notice for Feather-derived icons |
| Noto Sans SC / JP notices | `public/fonts/footer/OFL-SC.txt`, `public/fonts/footer/OFL-JP.txt` | SIL OFL 1.1 provenance notices; no corresponding font binaries are included in this source demo |

The HeroUI discrepancy is also present in the [pinned upstream LICENSE](https://raw.githubusercontent.com/heroui-inc/heroui/v3.2.6/LICENSE) and [package metadata](https://raw.githubusercontent.com/heroui-inc/heroui/v3.2.6/packages/react/package.json). The exact shipped notices are preserved rather than replaced by an assumed license. The [Lucide license](https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE) includes both the project's ISC terms and Feather-derived MIT terms.

## Package dependencies

`dependency-license-inventory.json` records names, resolved versions and declared licenses from `package-lock.json`. It is a metadata inventory, not a claim that all listed packages are installed, shipped or covered by the project license. The inventory flags known license-file discrepancies.

Dependencies include permissive licenses and component-scoped obligations such as MPL-2.0, LGPL-3.0-or-later and CC BY 4.0. This source release does not include `node_modules`, compiled bundles or native/WASM binaries. If distributing those artifacts later, review the components actually shipped and preserve their required notices and source/relinking provisions as applicable. Keep each dependency's full upstream license; do not replace it with this summary.

## Excluded production material

Production datasets, user reviews, anime poster originals, social fan art, author portraits, original product-brand illustrations and private account state are excluded. Third-party names in adapter source identify integrations and do not imply endorsement. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) before enabling an integration.

## Documentation screenshots

Two unedited public-product screenshots are included under `docs/screenshots/` to document the interface. They contain incidental third-party artwork, titles, logos and catalog data, plus the hosted product's branding. These materials are excluded from any eventual code license; no rights to reuse them independently are granted. Original poster or brand-illustration files are not included. See the [capture provenance](docs/screenshots/README.md). The standalone demo continues to use neutral synthetic assets.
