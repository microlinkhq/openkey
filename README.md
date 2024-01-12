<div align="center">
  <img src="https://github.com/microlinkhq/cdn/raw/master/dist/logo/banner.png#gh-light-mode-only" alt="microlink logo">
  <img src="https://github.com/microlinkhq/cdn/raw/master/dist/logo/banner-dark.png#gh-dark-mode-only" alt="microlink logo">
  <br>
  <br>
</div>

![Last version](https://img.shields.io/github/tag/microlinkhq/openkey.svg?style=flat-square)
[![Coverage Status](https://img.shields.io/coveralls/microlinkhq/openkey.svg?style=flat-square)](https://coveralls.io/github/microlinkhq/openkey)
[![NPM Status](https://img.shields.io/npm/dm/openkey.svg?style=flat-square)](https://www.npmjs.org/package/openkey)

> an AWS Gateway replacement for usage plans and keys for your HTTP API endpoint

## FAQ

### Why?

Until **openkey**, we use AWS Gateway feature for keys and plans for years. Although it was doing the job, it forced us to send all [api.microlink.io](https://api.microlink.io) traffic to AWS first for the control traffic, and then travel back to origin servers. We wanted to avoid that hop to provide a more responsive service.

### Is it a AWS Gateway replacement?

No, and we are not aspiring for it. We used to use a very specific feature present in the AWS Gateway service, and **openkey** is a replacement for that features, that's all. AWS Gateway can still do a lot of more things that this library.

### Why Redis?

We needed a backend layer fast for frequent writes, cheap at scale and mature enough for preventing vendor-lock in. We considered other alternatives such as SQLite, but according with this requeriments Redis is the no brain selection.

### Why key/value?

Originally this library was implemented using [hashes](https://redis.io/docs/data-types/hashes), but then since values are stored as string, it's necessary to cast value (for example, from string to number). Since we need to do that all the time, we prefer to use key/value in combination with JSON.parse/JSON.stringify. It makes the code tinier and easier to read.

## License

**openkey** © [microlink.io](https://microlink.io), released under the [MIT](https://github.com/microlinkhq/openkey/blob/master/LICENSE.md) License.<br>
Authored and maintained by [microlink.io](https://microlink.io) with help from [contributors](https://github.com/microlinkhq/openkey/contributors).

> [microlink.io](https://microlink.io) · GitHub [microlink.io](https://github.com/microlinkhq) · Twitter [@microlinkhq](https://twitter.com/microlinkhq)
