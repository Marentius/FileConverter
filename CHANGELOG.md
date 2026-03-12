# Changelog

## [1.2.1](https://github.com/Marentius/FileConverter/compare/fileconverter-v1.2.0...fileconverter-v1.2.1) (2026-03-12)


### Bug Fixes

* update jest scripts to use --testPathPatterns for Jest 30 ([417d0fe](https://github.com/Marentius/FileConverter/commit/417d0fe16c1a5a993072c3a3371dce1d9643ca13))
* update jest scripts to use --testPathPatterns for Jest 30 ([bb599ea](https://github.com/Marentius/FileConverter/commit/bb599ea3d70509803b00d049c596f4619b619385))

## [1.2.0](https://github.com/Marentius/FileConverter/compare/fileconverter-v1.1.3...fileconverter-v1.2.0) (2026-03-11)


### Features

* add npm publish with OIDC trusted publishing and provenance ([beb59c6](https://github.com/Marentius/FileConverter/commit/beb59c609fc630c8f578c458ab99ff04a1283976))
* add npm publish with OIDC trusted publishing and provenance ([9183280](https://github.com/Marentius/FileConverter/commit/91832807c0c3f11b0ce180f612bdc1562922b170))

## [1.1.3](https://github.com/Marentius/FileConverter/compare/fileconverter-v1.1.2...fileconverter-v1.1.3) (2026-03-11)


### Bug Fixes

* add path traversal protection for file operations (CWE-22) ([ffa3967](https://github.com/Marentius/FileConverter/commit/ffa39672da8f572d2d182a28f6ab675eb159c70c))
* enforce file size limits to prevent resource exhaustion (CWE-770) ([161c906](https://github.com/Marentius/FileConverter/commit/161c9065b3bbc69be5f8147341aa6505df3eb40c))
* replace any type with ConversionOptions in PDF CLI handler ([e05609a](https://github.com/Marentius/FileConverter/commit/e05609a1e47f575b1959bf592eb65e9d56145ca4))
* sanitize log output to prevent log injection attacks (CWE-117) ([55c48d0](https://github.com/Marentius/FileConverter/commit/55c48d0fb968fe6e9e0e34a68c9555871f1ba785))
* use crypto.randomBytes for job ID generation (CWE-330) ([bedaef2](https://github.com/Marentius/FileConverter/commit/bedaef21d5c019cbeacec58015d009712d0caea7))
* use eslint-disable for control-char regex in log sanitizer ([ab12341](https://github.com/Marentius/FileConverter/commit/ab1234137bfe228851f90169fa6ee643b1ff7012))
* validate CLI numeric parameters and PDF page ranges (CWE-20) ([9eaf114](https://github.com/Marentius/FileConverter/commit/9eaf114aa1fda1163c9b0b779e19855e9f335544))

## [1.1.2](https://github.com/Marentius/FileConverter/compare/fileconverter-v1.1.1...fileconverter-v1.1.2) (2026-03-11)


### Bug Fixes

* use PAT for release-please to trigger CI on release PRs ([cbd435f](https://github.com/Marentius/FileConverter/commit/cbd435fcec363d821d286fd18f4ca0e26b0c62f4))

## [1.1.1](https://github.com/Marentius/FileConverter/compare/fileconverter-v1.1.0...fileconverter-v1.1.1) (2026-03-11)


### Bug Fixes

* inject version from package.json at build time instead of hardcoding ([0b7250c](https://github.com/Marentius/FileConverter/commit/0b7250c2565b7aff334c3f52aa2d2ee2bffd93a4))

## [1.1.0](https://github.com/Marentius/FileConverter/compare/fileconverter-v1.0.0...fileconverter-v1.1.0) (2026-03-11)


### Features

* automate releases with release-please ([156e8d5](https://github.com/Marentius/FileConverter/commit/156e8d5cfc58a34a1e512b23419eca5bdb2c4d94))


### Bug Fixes

* install Pandoc and LaTeX in CI e2e-test job ([371db68](https://github.com/Marentius/FileConverter/commit/371db68ff9829780cc089bc2ec2c36324b9af3f1))
* require CI to pass before running release workflow ([b44a3e6](https://github.com/Marentius/FileConverter/commit/b44a3e6ecc62b2ef9bf4792ad8450d35505da3d3))
* use bash shell for cross-platform binary packaging in CI ([a4a3bdb](https://github.com/Marentius/FileConverter/commit/a4a3bdbee1348304b083ac4346c03e7035299af9))
