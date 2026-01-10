## [1.5.2](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.5.1...v1.5.2) (2026-01-10)


### Bug Fixes

* Resolve caminhos para absoluto para persistir configuração entre reinicializações ([8ac7bb2](https://github.com/riligar-solutions/elysia-sqlite/commit/8ac7bb24c1906ca1e60a391f4030d5c816b6638a))

## [1.5.1](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.5.0...v1.5.1) (2026-01-10)


### Bug Fixes

* Atualiza rotas do frontend para usar prefixo /sqlite ([258f60c](https://github.com/riligar-solutions/elysia-sqlite/commit/258f60cf066540e9ff3148b5b8d61753a69d3694))

# [1.5.0](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.4.0...v1.5.0) (2026-01-10)


### Features

* Altera prefixo padrão da rota para '/sqlite ([ecd96a1](https://github.com/riligar-solutions/elysia-sqlite/commit/ecd96a12fbe2f7759ffad2d50b131c25f0fb795e))

# [1.4.0](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.3.0...v1.4.0) (2026-01-10)


### Features

* change default prefix to /database ([846c769](https://github.com/riligar-solutions/elysia-sqlite/commit/846c769dd966af04fc45d70e598efd3662a45e48))

# [1.3.0](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.2.2...v1.3.0) (2026-01-10)


### Features

* add rate-limit to demo and ignore .db files ([acac158](https://github.com/riligar-solutions/elysia-sqlite/commit/acac1589f5d058fb170b0acede15bfd0c980c930))
* Persist config file alongside database by default ([eca968c](https://github.com/riligar-solutions/elysia-sqlite/commit/eca968c467e76087761431906942a5f10c3c4a37))

## [1.2.2](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.2.1...v1.2.2) (2026-01-10)


### Bug Fixes

* correctly return Response.redirect for trailing slash enforcement ([4c07678](https://github.com/riligar-solutions/elysia-sqlite/commit/4c0767816a39c1c19cf7a55487a80f631a1e56b9))

## [1.2.1](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.2.0...v1.2.1) (2026-01-10)


### Bug Fixes

* add global request logger for debugging ([06267bb](https://github.com/riligar-solutions/elysia-sqlite/commit/06267bba60f2a4ba1a61ee6321209d2fecd09b53))

# [1.2.0](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.7...v1.2.0) (2026-01-10)


### Features

* add debug route to inspect ui files ([b3e51f8](https://github.com/riligar-solutions/elysia-sqlite/commit/b3e51f8f309c745c12005673bdbcc21e9c2fb68e))

## [1.1.7](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.6...v1.1.7) (2026-01-10)


### Bug Fixes

* add cache-control headers and startup path logging ([e07431c](https://github.com/riligar-solutions/elysia-sqlite/commit/e07431cf229502804714b3bfa7d649ccecd89f53))

## [1.1.6](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.5...v1.1.6) (2026-01-10)


### Bug Fixes

* add debug logging for 404 assets ([55bf218](https://github.com/riligar-solutions/elysia-sqlite/commit/55bf21851a5539aa5696a6d3918beef390fcdbac))

## [1.1.5](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.4...v1.1.5) (2026-01-10)


### Bug Fixes

* enforce trailing slash redirect for admin root ([73b2674](https://github.com/riligar-solutions/elysia-sqlite/commit/73b2674bb8d932746782f1caa3bcd9b70d7af35a))

## [1.1.4](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.3...v1.1.4) (2026-01-10)


### Bug Fixes

* explicit file inclusion to exclude ui node_modules ([c98e7d4](https://github.com/riligar-solutions/elysia-sqlite/commit/c98e7d41f750b3ed065e94e2cbff51a5878893b5))

## [1.1.3](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.2...v1.1.3) (2026-01-10)


### Bug Fixes

* exclude UI source and node_modules from published package ([1316dc3](https://github.com/riligar-solutions/elysia-sqlite/commit/1316dc3ba13f2bfe57fc61e01a46b3ae60cdd422))

## [1.1.2](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.1...v1.1.2) (2026-01-10)


### Bug Fixes

* install UI dependencies in prepublishOnly ([20c4ebc](https://github.com/riligar-solutions/elysia-sqlite/commit/20c4ebcbc8c1aef0deeb271404269e522e2dcc00))

## [1.1.1](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.1.0...v1.1.1) (2026-01-10)


### Bug Fixes

* ensure UI build artifacts are published ([15f432c](https://github.com/riligar-solutions/elysia-sqlite/commit/15f432c8e86dff178ed19bf5d99664a3a0270ca9))

# [1.1.0](https://github.com/riligar-solutions/elysia-sqlite/compare/v1.0.0...v1.1.0) (2026-01-09)


### Features

* remove @elysiajs/static dependency ([3e03819](https://github.com/riligar-solutions/elysia-sqlite/commit/3e03819dd2226382de3bb86411e9bf8aef6b1db6))

# 1.0.0 (2026-01-09)


### Bug Fixes

* use secrets for npm token ([fc790b8](https://github.com/riligar-solutions/elysia-sqlite/commit/fc790b8f359bc0ad5f3358fe0122ab426294ff00))


### Features

* **api:** Add paginated rows endpoint ([09cd828](https://github.com/riligar-solutions/elysia-sqlite/commit/09cd828d022416356bbaa65488db022945e011e8))
* Create README track and set NPM token from vars ([33079ca](https://github.com/riligar-solutions/elysia-sqlite/commit/33079caca67b5ba02a819ebc52d30a059be425dd))
* implement secure auth with 2FA and onboarding ([041cd0d](https://github.com/riligar-solutions/elysia-sqlite/commit/041cd0d3f497e7bacfe67ca8ebb96525fac892f7))
* Improve dark mode switch and table styles ([d3ed7e5](https://github.com/riligar-solutions/elysia-sqlite/commit/d3ed7e5031c1bf9f49582f228b01462ab4904ebd))
* setup semantic-release workflow ([a3f1116](https://github.com/riligar-solutions/elysia-sqlite/commit/a3f11160c666afaf98c15e8307a3efa17b98ba95))
* **ui:** Extract TableSelector, DataGrid and Pagination components ([5ce3d06](https://github.com/riligar-solutions/elysia-sqlite/commit/5ce3d068b70c9ca5dc2c134e9eab32c28a233171))
