# Data sources and demo boundaries

The default demo uses fictional records and neutral local placeholder artwork. Scores, reviews and playback evidence are empty in the default demo; synthetic titles and dates are schema examples, not claims about real works or services. Production snapshots, catalog shards, reviews and original artwork files are not included. The two documentation-only public-product screenshots are an explicit exception: they show incidental third-party artwork and data, which are excluded from any eventual code license. See [screenshot provenance](screenshots/README.md).

Source adapters may remain as implementation examples. Their presence does not grant permission to scrape, republish a database, use posters or bypass a provider's terms. Before enabling an adapter, review its current terms, identify your own application, configure appropriate limits and maintain source-specific attribution.

## Source-specific boundaries

- **Bangumi:** the [official policy](https://bgm.tv/about/copyright) distinguishes CC BY-SA wiki metadata from users' original posts/comments/images and pre-existing copyrighted works. Do not assume its wiki license covers reviews or anime posters. Data/API restrictions also apply. Any future distribution of qualifying adapted wiki text needs source attribution and the applicable [CC BY-SA 3.0 terms](https://creativecommons.org/licenses/by-sa/3.0/); keep that data separate from the software license. Review [API User-Agent guidance](https://github.com/bangumi/api/blob/master/docs-raw/user%20agent.md) before live use.
- **bangumi-data:** its [repository](https://github.com/bangumi-data/bangumi-data) provides data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit the project, preserve source/license links and identify modifications if later distributing it. The license does not clear unrelated enrichment or linked artwork.
- **Wikidata:** [structured data is CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). Linked external content has its own rights.
- **Kitsu:** [API documentation](https://kitsu.docs.apiary.io/) describes access, not a verified blanket redistribution license. Current content-reuse terms were not confirmed during preparation; review `https://kitsu.app/terms` before enabling live use.
- **Jikan / MyAnimeList:** [Jikan's MIT license](https://github.com/jikan-me/jikan-rest/blob/master/LICENSE) covers its software, not automatically MyAnimeList data, posters or reviews. Current MAL terms were not confirmed during preparation; review `https://myanimelist.net/about/terms_of_use` and `https://myanimelist.net/static/apiagreement.html` before enabling live use.
- **IMDb:** [non-commercial datasets](https://data.imdb.com/non-commercial-datasets/) are subject to personal/non-commercial restrictions and additional terms. No IMDb rating dataset is included. An outbound identifier/link is different from redistributing a dataset.
- **Other catalogs, reviews and viewing providers:** links do not prove a title is currently available, licensed or playable in a region. No real production playback inventory or reviewer material is supplied with the demo.

Do not add production data by copying generated TypeScript shards or test fixtures. Regenerate runtime modules only from approved input. Do not export private watchlists, account IDs, credentials or runtime databases. A new public dataset, poster collection or binary release needs its own rights review.

## Curated links and exact-part numbering

The source includes reconciliation code for reviewed exact-identity platform links and part-relative episode scopes. Both runtime input files are empty in the demo and reset by data preparation. Tests inject fictional records rather than production inventories or real title offers. Deployment-specific curated data is intentionally omitted; see [exact resource matching](exact-resource-matches.md).
