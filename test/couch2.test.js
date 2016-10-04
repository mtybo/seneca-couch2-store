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

var Shared = require('seneca-store-test')


var si = Seneca({
  default_plugins: {
    'mem-store': false
  }
})

si.__testcount = 0
var testcount = 0


describe('couch tests', function () {
  before({}, function (done) {
    if (si.version >= '2.0.0') {
      si.use('entity')
    }

    si.use(require('..'), { host: '127.0.0.1', port: 5984, dbname: 'senecatest', basename: 'seneca_type' })
    si.ready(done)
  })

  it('basic test', function (done) {
    testcount++
    Shared.basictest(si, done)
  })

  it('extra test', function (done) {
    testcount++
    extratest(si, done)
  })

  it('close test', function (done) {
    Shared.closetest(si, testcount, done)
  })
})


function extratest (si, done) {
  console.log('EXTRA')

  Async.series(
      {
        remove01: function (cb) {
          var cl = si.make$('lmt')
          cl.remove$({all$: true}, function (err, foo) {
            Assert.ok(null == err)
            cb()
          })
        },

        remove02: function (cb) {
          var cl = si.make$('foo')
          cl.remove$({all$: true}, function (err, foo) {
            Assert.ok(null == err)
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

        listall: function (cb) {
          var cl = si.make$({name$: 'lmt'})
          cl.list$({}, function (err, lst) {
            Assert.ok(null == err)
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

            foo.save$(function (err, foo) {
              Assert.ok(null == err)

              foo.load$({id: foo.id}, function (err, foo) {
                if (err) done(err)
                Assert.ok(foo.id)
                Assert.equal(foo.p1, 'value1')
                Assert.equal(foo.p2, 2.2)
              })
              cb()
            })
          })
        },

        remove1: function(cb) {
          var cl = si.make$({name$:'lmt'})
          cl.remove$({p2: 2.2}, function(err,res){
            Assert.ok(null == err)
            cb()
          })
        },

        remove2: function(cb) {
          var cl = si.make$({name$:'lmt'})
          cl.remove$({p1: 'v1', p2: 'v2', all$: true}, function(err, res){
            Assert.ok(null == err)
            cb()
          })
        },

        remove3: function(cb) {
          var cl = si.make$({name$:'lmt'})
          cl.remove$({p1: 'v1', all$: true}, function(err, res){
            Assert.ok(null == err)
            cb()
          })
        },

        remove4: function(cb) {
          var cl = si.make$({name$:'lmt'})
          cl.remove$({p1: 'v2'}, function(err, res){
            Assert.ok(null == err)
            cb()
          })
        },

        remove5: function(cb) {
          var cl = si.make$({name$:'lmt'})
          cl.remove$({p1: 'v3', limit$: 2}, function(err, res){
            Assert.ok(null == err)
            cb()
          })
        },

      },

      function (err, out) {
        if (err) done(err)
        si.__testcount++
        done()
      }
  )

  si.__testcount++
}


var si2 = Seneca()

describe('couch regular connection test', function () {
  before({}, function (done) {
    if (si2.version >= '2.0.0') {
      si2.use('entity')
    }

    si2.use(require('..'), { host: '127.0.0.1', port: 5984, dbname: 'senecatest', basename: 'seneca_type' })
    si2.ready(done)
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

        foo2.delete$(foo1.id, function (err, foo3) {
          expect(err).to.not.exist()
          expect(foo3).to.not.exist()

          done()
        })
      })
    })
  })
})

