![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [senecajs.org] data storage plugin

# seneca-couch2-store
[![npm version][npm-badge]][npm-url]
[![Dependency Status][david-badge]][david-url]
[![JavaScript Style Guide][standard-badge]][standard-url]

This module is a plugin for [Seneca]. It provides a storage engine that uses __CouchDb *version 2*__ to persist data. Underneath the covers, it uses [nano] driver.

If you are new to Seneca in general, please take a look at [senecajs.org]. It has everything from tutorials to sample apps to help get you up and running quickly.

### Supported functionality

All Seneca data store supported functionality is implemented in seneca-store-test as a test suite. The tests represent the store functionality specifications. 

Where in doubt, author referred to [seneca-mongo-store] behaviour.

## Install

To install, simply use npm. Remember you will need to install [Seneca] separately.

```sh
npm install seneca
npm install seneca-couch2-store
```

## Quick Example

```js
var seneca = require('seneca')()
seneca.use('couch2-store', {
  host: '127.0.0.1',
  port: 5984,
  dbname: 'senecadb',
  basename: 'seneca_type'
})

seneca.ready(function () {
  var apple = seneca.make$('fruit')
  apple.name = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function (err, apple) {
    console.log("apple.id = " + apple.id)
  })
})
```

## Configuration

At the minimum, you need to create a database (specified as 'senecadb' in the example above) with an index on a field that will be used to indicate entity's base, name combination ('seneca_type' above). You might want to specify additional indexes, as appropriate for your data and queries.

## Usage

You don't use this module directly. It provides an underlying data storage engine for the Seneca entity API:

```js
var entity = seneca.make$('typename')
entity.someproperty = "something"
entity.anotherproperty = 100

entity.save$(function (err, entity) { ... })
entity.load$({id: ...}, function (err, entity) { ... })
entity.list$({property: ...}, function (err, entity) { ... })
entity.remove$({id: ...}, function (err, entity) { ... })
```

### Query Support

The standard Seneca query format is supported:

- `.list$({f1:v1, f2:v2, ...})` implies pseudo-query `f1==v1 AND f2==v2, ...`.

- `.list$({f1:v1, ..., sort$:{field1:1}})` means sort by f1, ascending.

- `.list$({f1:v1, ..., sort$:{field1:-1}})` means sort by f1, descending.

- `.list$({f1:v1, ..., limit$:10})` means only return 10 results.

- `.list$({f1:v1, ..., skip$:5})` means skip the first 5.

- `.list$({f1:v1, ..., fields$:['fd1','f2']})` means only return the listed fields.

Note: you can use `sort$`, `limit$`, `skip$` and `fields$` together.

- `.list$({f1:v1, ..., sort$:{field1:-1}, limit$:10})` means sort by f1, descending and only return 10 results.

### Native Driver

As with all seneca stores, you can access the native driver. In this plugin, a callback passed to __*native$*__ method has an __*err*__, and 3 other parameters; __*db*__, as resulting from db = Nano('http://localhost:5984/senecadb'), and __*nano*__, as resulting from nano = Nano('http://localhost:5984'), and __*dbname*__ (to be used with nano). The code below illustrates the usage.

```js
foo.native$(function (err, db) {
  if (err) return done(err)
  else {
    db.get('abc1', function (err, entp) {
      if (err) return done(err)
      else done(null, entp)
    })
  }
})

foo.native$(function (err, db, nano, dbname) {
  if (err) return done(err)
  else {
    var mangoq = { selector: { b: { $ne: 'b2' } }, sort: [ { _id: 'asc' } ] }
    var opts = { db: dbname, path: '_find', body: mangoq, method: 'POST' }
    nano.request(opts, function (err, entp) {
      if (err) return done(err)
      else done(null, entp)
    })
  }
})
```

You can also use `entity.list$({ native$: {-couch-query-} })` to get a list of entities while specifying query in CouchDb version 2 syntax (where {-couch-query-} complies with mango syntax).

```js
order.list$({ selector: { price: { $gt: 100 } }, sort: [ { description: 'asc' } ] }, function (err, list) {
	if (err) return done(err)
	else done(null, list)
})
```

### Seneca data store vs typical CouchDb usage

There is some impedance mismatch between functionality provided by Seneca entity API and native functionality of CouchDb.  Developers familiar with CouchDb are used to atomic updates of entire documents, and to optimistic locking of documents for modification (update or removal). The following briefly summarises the gotchas:

- __*load*__ - if not found null, not error,
- __*save / insert*__ - pretty much as expected,
- __*save / update*__ - no optimistic locking and no atomic document update; i.e., the doc is re-read from the db, values of fields present in the local entity are updated (other fields are unaffected), and the doc is stored using latest rev id; notice, that fields can be added to a document, but once added they cannot be removed,
- __*remove*__ - analogous to save / update, no optimistic locking; the doc is re-read from the db before removal 

## Contributing

The [Senecajs org] encourages open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch with the [Senecajs org].

## To run tests with Docker

Build the CouchDb Docker image:

```sh
npm run build
```

Start the CouchDb container:
```sh
npm run start
```

Stop the CouchDb container:
```sh
npm run stop
```

While the container is running you can run the tests in another terminal:
```sh
npm run test
```

## License

Copyright (c) 2016, Mark Tyborowski. Licensed under [MIT].

[MIT]: ./LICENSE.txt
[npm-badge]: https://img.shields.io/npm/v/seneca-couch2-store.svg
[npm-url]: https://npmjs.com/package/seneca-couch2-store
[senecajs.org]: http://senecajs.org/
[Senecajs org]: https://github.com/senecajs/
[Seneca]: https://www.npmjs.com/package/seneca
[seneca-mongo-store]: https://npmjs.com/package/seneca-mongo-store
[nano]: https://www.npmjs.com/package/nano
[david-badge]: https://david-dm.org/mtybo/seneca-couch2-store.svg
[david-url]: https://david-dm.org/mtybo/seneca-couch2-store
[standard-badge]: https://cdn.rawgit.com/feross/standard/master/badge.svg
[standard-url]: https://github.com/feross/standard
