# Repository setup

The owner created [hubeiqiao/tiaofan](https://github.com/hubeiqiao/tiaofan) as a public repository. Before the source upload, its identity and public visibility were verified and the repository had no branches, files or commits. The sanitized snapshot initializes main; no existing work is overwritten.

Repository metadata, also available in ../repo-metadata.json:

- Owner: hubeiqiao
- Name: tiaofan
- Description: 三语动画发现与追番工具 / Trilingual anime discovery and watchlist app
- Homepage: https://anime.hubeiqiao.com
- Default branch: main
- Visibility: public, selected by the owner
- Topics: anime, anime-discovery, bangumi, react, typescript, vinext, cloudflare-workers, i18n, mcp

The source tree includes the recommended description and topics; their presence here does not imply the GitHub About settings were changed.

Only the reviewed source edition is uploaded, with a fresh history. The original production repository, dependencies, build output, runtime state, private records and excluded artwork are not part of the upload.

## Remaining release decisions

1. Confirm the original-code license and copyright holder. MIT is the proposed option, not an adopted grant.
2. If MIT is selected, add the approved LICENSE, update package.json and its lockfile root, change synthetic-fixture license labels in scripts/prepare-demo-data.mjs, regenerate fixtures, and update license-status wording. Preserve all third-party notices and exclusions.
3. Review the two accepted development-tool advisory roots and inherited lint backlog.
4. Configure an appropriate private security-reporting route in repository settings if available.
5. Check GitHub CI on the exact uploaded commit, including its narrowly accepted toolchain advisories, and verify the remote manifest.

Public visibility alone does not complete open-source licensing. Do not describe the project code as MIT-licensed until the owner has approved and adopted that license.
