/* Copyright (c) 2016 Mark Tyborowski, MIT License */
'use strict'


var _ = require('lodash')
var Nano = require('nano')

var internals = {
  name: 'couch2-store',
  basename: 'seneca_type',
  dbname: 'senecadb'
}


function mango (args) {
  var q = args.q
  var query = {}

  query.selector = {}
  for (var qp in q) {
    if (!qp.match(/\$$/)) {
      if ('id' === qp && q[qp]._id) query.selector['_id'] = q[qp]._id
      else if ('id' === qp) query.selector['_id'] = q[qp]
      else query.selector[qp] = q[qp]
    }
  }
  var canon = args.ent.canon$({object: true})
  query.selector[internals.basename] = (canon.base ? canon.base + '_' : '') + canon.name

  if (q.sort$) {
    query.sort = []
    for (var sf in q.sort$) break
    var sd = q.sort$[sf] < 0 ? 'desc' : 'asc'
    var by = {}
    by[sf] = sd
    query.sort[0] = by
  }
  if (q.limit$) {
    query.limit = q.limit$
  }
  if (q.skip$) {
    query.skip = q.skip$
  }
  if (q.fields$) {
    query.fields = q.fields$
  }

  return query
}


function mangolist (args) {
  if (args.q.native$) return args.q.native$
  else return mango(args)
}


module.exports = function (opts) {
  var seneca = this
  var desc

  var nano = null
  var db = null


  function error (args, err, cb) {
    if (err && !('not_found' === err.error)) {
      seneca.log.error('entity', err, { store: internals.name })
      cb(err)
      return true
    }
    else return false
  }


  function configure (conf, cb) {
    if (conf.basename) {
      internals.basename = conf.basename
    }
    if (conf.dbname) {
      internals.dbname = conf.dbname
    }
    // nano = Nano('http://localhost:5984')
    // db = Nano('http://localhost:5984/senecadb')
    nano = Nano('http://' + conf.host + ':' + conf.port)
    db = nano.use(conf.dbname)
    cb()
  }


  var store = {
    name: internals.name,

    close: function (args, cb) {
      if (db) {
        db = null
      }
      return cb(null)
    },


    save: function (args, cb) {
      var ent = args.ent
      var update = !!ent.id

      if (update) {
        db.get(ent.id, function (err, found) { // get complete doc from db
          if (!error(args, err, cb)) {
            if (found) {
              var entp = {}
              for (var qp in found) { // populate update structure
                entp[qp] = found[qp]
              }
              var fields = ent.fields$()
              fields.forEach(function (field) { // override fields that could've changed
                entp[field] = ent[field]
              })

              db.insert(entp, function (err, insert) {
                if (!error(args, err, cb)) {
                  seneca.log.debug('save/update', ent, desc)
                  cb(null, ent)
                }
              })
            }
            else { // someone else deleted the doc in meantime
              delete ent.id
              update = false
            }
          }
        })
      }

      if (!update) { // insert of new or previously deleted doc
        var entp = {}

        if (void 0 !== ent.id$) entp._id = ent.id$

        var fields = ent.fields$()
        fields.forEach(function (field) {
          entp[field] = ent[field]
        })

        var canon = ent.canon$({object: true})
        entp[internals.basename] = (canon.base ? canon.base + '_' : '') + canon.name

        db.insert(entp, function (err, insert) {
          if (!error(args, err, cb)) {
            ent.id = insert.id

            seneca.log.debug('save/insert', ent, desc)
            cb(null, ent)
          }
        })
      }
    },


    load: function (args, cb) {
      var mangoq = mango(args)
      mangoq.limit = 1
      var opts = { db: internals.dbname, path: '_find', body: mangoq, method: 'POST' }

      // too lazy to have short-circuit query when only id is specified, maybe later
      nano.request(opts, function (err, entp) {
        if (!error(args, err, cb)) {
          var fent = null

          if (entp) {
            entp.docs.forEach(function (doc) {
              fent = args.qent.make$(doc)
              fent.id = fent._id
              delete fent._id
            })
          }

          seneca.log.debug('load', args.q, fent, desc)
          cb(null, fent)
        }
      })
    },


    list: function (args, cb) {
      var mangoq = mangolist(args)
      var opts = { db: internals.dbname, path: '_find', body: mangoq, method: 'POST' }

      nano.request(opts, function (err, entp) {
        if (!error(args, err, cb)) {
          var list = []

          if (entp) {
            entp.docs.forEach(function (doc) {
              var fent = args.qent.make$(doc)
              fent.id = fent._id
              delete fent._id
              list.push(fent)
            })
          }

          seneca.log.debug('list', args.q, list, desc)
          cb(null, list)
        }
      })
    },


    remove: function (args, cb) {
      var mangoq = mango(args)
      var load = _.isUndefined(args.q.load$) ? true : args.q.load$ // default true
      var all = args.q.all$ // default false, set for clarity

      var opts = { db: internals.dbname, path: '_find', body: mangoq, method: 'POST' }
      // either delete all or just one, reset limit appropriately
      mangoq.limit = (all ? Number.MAX_SAFE_INTEGER : 1)

      // not very happy about breaking transaction acidity, but...
      nano.request(opts, function (err, entp) {
        if (!error(args, err, cb)) {
          if (entp && entp.docs && entp.docs.length > 0) {
            var fent = null
            var deleteq = {}
            deleteq.docs = []

            entp.docs.forEach(function (doc) {
              if (!all && load) { // all takes presedence
                fent = args.qent.make$(doc)
                fent.id = fent._id
                delete fent._id
              }

              var ent = {}
              ent._id = doc._id
              ent._rev = doc._rev
              ent._deleted = true
              deleteq.docs.push(ent)
            })

            var opts_d = { db: internals.dbname, path: '_bulk_docs', body: deleteq, method: 'POST' }
            nano.request(opts_d, function (err) {
              if (all) { // again, all takes precedence
                seneca.log.debug('remove/all', args.q, desc)
                cb(err)
              }
              else {
                seneca.log.debug('remove/one', args.q, fent, desc)
                cb(err, fent)
              }
            })
          }
          else {
            seneca.log.debug('remove/none', args.q, desc)
            cb(null)
          }
        }
      })
    },


    native: function (args, cb) {
      cb(null, db, nano, internals.dbname)
    }
  }


  var meta = seneca.store.init(seneca, opts, store)
  desc = meta.desc


  seneca.add({ init: store.name, tag: meta.tag }, function (args, done) {
    configure(opts, function (err) {
      if (err) {
        return seneca.die('store', err, { store: store.name, desc: desc })
      }
      return done()
    })
  })


  return { name: store.name, tag: meta.tag }
}
