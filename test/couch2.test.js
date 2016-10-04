'use strict'

var Seneca = require('seneca')
var Async = require('async')

var Lab = require('lab')
var Assert = require('assert')
var Code = require('code')
var expect = Code.expect

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var before = lab.before
var after = lab.after

var Shared = require('seneca-store-test')

var Nano = require('nano')

var si = Seneca({
  default_plugins: {
    'mem-store': false
  }
})

si.__testcount = 0
var testcount = 0

var nano = null

describe('couch tests', function () {
  before({}, function (done) {
    if (si.version >= '2.0.0') {
      si.use('entity')
    }

    nano = Nano('http://127.0.0.1:5984')
    nano.db.create('seneca_db-test', function (err, response) {
      if (err && 412 !== err.statusCode) {
      // if (err) {
        console.log(err)
      }
      else {
        // console.log(response)

        var opts = { method: 'POST', db: 'seneca_db-test', path: '_index',
          body: {index: {fields: ['seneca_type']}, name: 'seneca_type-index'} }
        nano.request(opts, function (err, response) {
          if (err) {
            console.log(err)
          }
          else {
            // console.log(response)

            si.use(require('..'), {host: '127.0.0.1', port: 5984, dbname: 'seneca_db-test', basename: 'seneca_type'})

            si.ready(done)
          }
        })
      }
    })
  })

  it('basic test', function (done) {
    testcount++
    Shared.basictest(si, done)
  })

  it('extra test', function (done) {
    testcount++
    extratest(si, done)
  })

  it('native test', function (done) {
    testcount++
    nativetest(si, done)
  })

  it('close test', function (done) {
    Shared.closetest(si, testcount, done)
  })

  after({}, function (done) {
    nano.db.destroy('seneca_db-test')

    done()
  })
})

function extratest (si, done) {
  console.log('EXTRA')

  Async.series(
    {
      removenonexistent: function (cb) {
        var cl = si.make$('foo')
        cl.remove$({id: 'not_existent'}, function (err, foo) {
          Assert.ok(null == err)
          // console.log('removenonexistent', foo)
          cb()
        })
      },

      insert1st: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insertload1: function (cb) {
        var cl = si.make$('klm')
        cl.id$ = 'klm1'
        cl.k = 'k0'
        cl.l = 'l0'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          // console.log('insertload1, saved', foo)
          cl.load$('klm1', function (err, foo2) {
            Assert.ok(null == err)
            // console.log('insertload1, loaded', foo2)
            cb()
          })
        })
      },

      // commented out to avoid alarming unsuspecting user
      // error is triggered and then checked on purpose, the behaviour mimicks seneca-mongo-store
      // insertsame: function (cb) {
      //   var cl = si.make$('bmc')
      //   cl.id$ = 'abc123457'
      //   cl.p1 = 'v3'
      //   cl.save$(function (err, foo) {
      //     Assert.ok(null == err)
      //     Assert.equal(foo.id, 'abc123457')
      //     Assert.equal(foo.p1, 'v3')
      //     var cl2 = si.make$('bmc')
      //     cl2.id$ = 'abc123457'
      //     cl2.p1 = 'v5'
      //     cl2.save$(function (err2, foo2) {
      //       // yes, error is expected here, another doc with the same id is being inserted
      //       // console.log('insertsame, after save 2', err2)
      //       if (err2) return cb()
      //     })
      //   })
      // },

      loadnonexistent: function (cb) {
        var cl = si.make$('lmt')
        cl.load$('not_existent', function (err, foo) {
        // cl.load$({id: 'not_existent'}, function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insertremoveload: function (cb) {
        var cl = si.make$('klm')
        cl.id$ = 'klm000'
        cl.k = 'k0'
        cl.l = 'l0'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cl.remove$('klm000', function (err, foo1) {
            Assert.ok(null == err)
            cl.load$('klm000', function (err, foo2) {
              Assert.ok(null == err)
              cb()
            })
          })
        })
      },

      listall: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.list$({}, function (err, lst) {
          Assert.ok(null == err)
          console.log('listall, size', lst.length)
          Assert.equal(3, lst.length)
          cb()
        })
      },

      listlimit1skip1: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.list$({limit$: 1, skip$: 1}, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(1, lst.length)
          cb()
        })
      },

      listlimit2skip3: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.list$({limit$: 2, skip$: 3}, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(0, lst.length)
          cb()
        })
      },

      listlimit5skip2: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.list$({limit$: 5, skip$: 2}, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(1, lst.length)
          cb()
        })
      },

      insertUpdate: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'value1'
        cl.p2 = 2
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          Assert.ok(foo.id)
          Assert.equal(foo.p1, 'value1')
          Assert.equal(foo.p2, 2)

          delete foo.p1
          foo.p2 = 2.2

          // console.log(foo)
          foo.save$(function (err, foo) {
            Assert.ok(null == err)

            foo.load$({id: foo.id}, function (err, foo) {
              if (err) done(err)
              // console.log(foo)

              Assert.ok(foo.id)
              Assert.equal(foo.p1, 'value1')
              Assert.equal(foo.p2, 2.2)
            })
            cb()
          })
        })
      },

      remove1: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.remove$({p2: 2.2}, function (err, res) {
          Assert.ok(null == err)
          cb()
        })
      },

      remove2: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.remove$({p1: 'v1', p2: 'v2', all$: true}, function (err, res) {
          Assert.ok(null == err)
          cb()
        })
      },

      remove3: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.remove$({p1: 'v1', all$: true}, function (err, res) {
          Assert.ok(null == err)
          cb()
        })
      },

      remove4: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.remove$({p1: 'v2'}, function (err, res) {
          Assert.ok(null == err)
          cb()
        })
      },

      remove5: function (cb) {
        var cl = si.make$({name$: 'lmt'})
        cl.remove$({p1: 'v3', limit$: 2}, function (err, res) {
          Assert.ok(null == err)
          cb()
        })
      }
    },

    function (err, out) {
      if (err) return done(err)
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

function nativetest (si, done) {
  console.log('NATIVE')

  Async.series(
    {
      insert0: function (cb) {
        var cl = si.make$('abc')
        cl.id$ = 'abc0'
        cl.a = 'a0'
        cl.b = 'b0'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insert1: function (cb) {
        var cl = si.make$('abc')
        cl.id$ = 'abc1'
        cl.a = 'a1'
        cl.b = 'b1'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insert2: function (cb) {
        var cl = si.make$('abc')
        cl.id$ = 'abc2'
        cl.a = 'a1'
        cl.b = 'b2'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      query1: function (cb) {
        var foo = si.make$('abc')
        foo.native$(function (err, db, nano, dbname) {
          Assert.ok(null == err)

          var mangoq = { selector: { b: { $ne: 'b2' } }, sort: [ { _id: 'asc' } ] }
          var opts = { db: dbname, path: '_find', body: mangoq, method: 'POST' }
          nano.request(opts, function (err, entp) {
            Assert.ok(null == err)
            var list = []

            if (entp) {
              entp.docs.forEach(function (doc) {
                var fent = foo.make$(doc)
                fent.id = fent._id
                delete fent._id
                list.push(fent)
              })
            }

            Assert.equal(2, list.length)
            Assert.ok(list[0].id)
            Assert.equal(list[0].a, 'a0')
            Assert.equal(list[0].b, 'b0')
            Assert.ok(list[1].id)
            Assert.equal(list[1].a, 'a1')
            Assert.equal(list[1].b, 'b1')
            cb()
          })
        })
      },

      query2: function (cb) {
        var foo = si.make$('abc')
        foo.native$(function (err, db) {
          Assert.ok(null == err)

          db.get('abc1', function (err, found) {
            Assert.ok(null == err)
            Assert.equal('abc1', found._id)
            Assert.equal(found.a, 'a1')
            Assert.equal(found.b, 'b1')
            cb()
          })
        })
      },

      listquery1: function (cb) {
        var foo = si.make$('abc')
        var body = { selector: { a: 'a1', b: 'b2' } }
        foo.list$({ native$: body }, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(1, lst.length)
          Assert.ok(lst[0].id)
          Assert.equal(lst[0].a, 'a1')
          Assert.equal(lst[0].b, 'b2')
          cb()
        })
      },

      listquery2: function (cb) {
        var foo = si.make$('abc')
        var body = { selector: { a: 'a1' }, sort: [ { _id: 'asc' } ] }
        foo.list$({ native$: body }, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(2, lst.length)
          Assert.ok(lst[0].id)
          Assert.equal(lst[0].a, 'a1')
          Assert.equal(lst[0].b, 'b1')
          Assert.ok(lst[1].id)
          Assert.equal(lst[1].a, 'a1')
          Assert.equal(lst[1].b, 'b2')
          cb()
        })
      }
    },

    function (err, out) {
      if (err) done(err)
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

var si2 = Seneca({
  default_plugins: {
    'mem-store': false
  }
})

describe('couch regular connection test', function () {
  before({}, function (done) {
    if (si2.version >= '2.0.0') {
      si2.use('entity')
    }

    nano = Nano('http://127.0.0.1:5984')
    nano.db.create('seneca_db-test2', function (err, response) {
      if (err && 412 !== err.statusCode) {
      // if (err) {
        console.log(err)
      }
      else {
        // console.log(response)

        var opts = { method: 'POST', db: 'seneca_db-test2', path: '_index',
          body: {index: {fields: ['seneca_type']}, name: 'seneca_type-index'} }
        nano.request(opts, function (err, response) {
          if (err) {
            console.log(err)
          }
          else {
            // console.log(response)

            si2.use(require('..'), {host: '127.0.0.1', port: 5984, dbname: 'seneca_db-test2', basename: 'seneca_type'})

            si2.ready(done)
          }
        })
      }
    })
  })

  it('simple test', function (done) {
    var foo = si2.make$('foo')
    foo.p1 = 'v1'
    foo.p2 = 'v2'

    foo.save$(function (err, foo1) {
      expect(err).to.not.exist()
      expect(foo1.id).to.exist()

      foo1.load$(foo1.id, function (err, foo2) {
        expect(err).to.not.exist()
        expect(foo2).to.exist()
        expect(foo2.id).to.equal(foo1.id)
        expect(foo2.p1).to.equal('v1')
        expect(foo2.p2).to.equal('v2')

        foo2.remove$(foo1.id, function (err, foo3) {
          expect(err).to.not.exist()
          // console.log(foo3)
          expect(foo3).to.exist()

          foo.load$(foo2.id, function (err, foo4) {
            expect(err).to.not.exist()
            expect(foo4).to.not.exist()

            done()
          })
        })
      })
    })
  })

  after({}, function (done) {
    nano.db.destroy('seneca_db-test2')

    done()
  })
})

