/* Copyright (c) 2016 Mark Tyborowski, MIT License */
"use strict"


var _ = require('lodash')
var nano = require('nano')

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
      if (qp == 'id' && q[qp]._id) query.selector['_id'] = q[qp]._id
      else if (qp == 'id') query.selector['_id'] = q[qp]
      else query.selector[qp] = q[qp]
    }
  }
  var canon = args.ent.canon$({object:true})
  var canonical = (canon.base ? canon.base + '_' : '') + canon.name
  query.selector[internals.basename] = canonical

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


module.exports = function(opts) {
  var seneca = this
  var desc
  var db = null
  var dbinst = null

  function error (args, err, cb) {
    if (err && !(err.error && err.error == 'not_found')) {
      seneca.log.error('entity', err, { store: internals.name })
      cb(err)
      return true
    }
    return false
  }

  function configure (conf, cb) {
    if (conf.basename) {
      internals.basename = conf.basename
    }
    if (conf.dbname) {
      internals.dbname = conf.dbname
    }
    // db = nano('http://localhost:5984')
    // dbinst = nano('http://localhost:5984/senecadb')
    db = nano('http://' + conf.host + ':' + conf.port)
    dbinst = db.use(conf.dbname)
    cb()
  }


  var store = {
    name: internals.name,

    close: function (args, cb) {
      if (dbinst) {
        dbinst = null
      }
      return cb(null)
    },


    save: function (args, cb) {
      var ent = args.ent
      var entp = {}
      var fields = ent.fields$()
      fields.forEach(function (field) {
        entp[field] = ent[field]
      })

      var canon = ent.canon$({object:true})
      var canonical = (canon.base ? canon.base + '_' : '') + canon.name
      entp[internals.basename] = canonical

      if (!!ent.id) {
        entp._id = ent.id
        delete entp.id

        dbinst.insert(entp, function(err, result) {
            if (!error(args, err, cb)) {
              ent._rev = result.rev
              delete ent.id$

              seneca.log.debug('save/update', ent, desc)
              cb(null, ent)
            }
        })
      }
      else {
        if (void 0 !== ent.id$) entp._id = ent.id$

        dbinst.insert(entp, function (err, result) {
            if (!error(args, err, cb)) {
              ent.id = result.id
              ent._rev = result.rev

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

        //too lazy to have short-circuit query when only id is specified, maybe later
        db.request(opts, function(err, entp) {
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
      var mangoq = mango(args)
      var opts = { db: internals.dbname, path: '_find', body: mangoq, method: 'POST' }

      db.request(opts, function(err, entp) {
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

      var opts = { db: internals.dbname, path: '_find', body: mangoq, method: 'POST' }
      // unless set or all, default to 1
      if (_.isUndefined(mangoq.limit)) mangoq.limit = (!args.q.all$ ? 1 : Number.MAX_SAFE_INTEGER )

      // not very happy about breaking transaction acidity, but...
      db.request(opts, function(err, entp) {
          if (!error(args, err, cb)) {
            if (entp) {
              var fent = null
              var deleteq = {}
              deleteq.docs = []

              entp.docs.forEach(function (doc, index) {
                  if (index == 1 && mangoq.limit == 1 && load) {
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
              db.request(opts_d, function(err) {
                  if (fent) cb(err, fent)
                  else cb(err)
              })
            }
          }
      })

    },

    native: function (args, cb) {
      var opts = { db: internals.dbname, path: '_find', method: 'POST' }
      opts.body = args.q.native$

      db.request(opts, function(err, entp) {
          if (!error(args, err, cb)) {
            cb(null, db)
          }
          else {
            cb(err)
          }
      })
    }
  }


  var meta = seneca.store.init(seneca, opts, store);
  desc = meta.desc;


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