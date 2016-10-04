![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [senecajs.org] data storage plugin

# seneca-couch2-store

This module is a plugin for [Seneca]. It provides a storage engine that uses
__CouchDb **version 2**__ to persist data.


If you are new to Seneca in general, please take a look at [senecajs.org]. It has everything from
tutorials to sample apps to help get you up and running quickly.


## Install
To install, simply use npm. Remember you will need to install [Seneca]
separately.

```
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
  apple.name  = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function (err,apple) {
    console.log( "apple.id = "+apple.id  )
  })
})
```

## Configuration

At the minimum, you need to create a database (specified as 'senecadb' in the example above) with an index on a field that will be used to indicate entity's base, name combination ('seneca_type' above).
You might want to specify additional indexes, as appropriate for you data and queries.


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


## License
Copyright (c) 2016, Mark Tyborowski.
Licensed under [MIT][].

[MIT]: ./LICENSE.txt
[senecajs.org]: http://senecajs.org/
[Seneca]: https://www.npmjs.com/package/seneca
