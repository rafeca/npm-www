// slightly less stupid download counts
// The download API is in /npm/download-counts.
// If the downloads API isn't running, you get nothing, and we display nothing.

module.exports = downloads

var AC = require('async-cache')
var hh = require('http-https')
var parse = require('parse-json-response')
var url = require('url')

var cache = new AC({
  max: 1000,
  maxAge: 1000 * 60 * 60,
  load: load
})

var config = require('../config.js')
var qs = require('querystring')

function downloads (period, detail, pkg, cb) {

  // pkg is optional
  if (typeof cb !== 'function')
    cb = pkg, pkg = null

  var k = JSON.stringify([period, pkg, detail])
  cache.get(k, cb)
}

function load (k, cb) {
  k = JSON.parse(k)
  var period = k[0]
  var pkg = k[1]
  var detail = k[2]

  if (!config.downloads) {
    return cb(null, 0)
  }
  var endpoint = config.downloads.url + detail + "/" + period
  if (pkg) endpoint += "/" + pkg

  // we want download stats!
  var r = url.parse(endpoint)
  r.rejectUnauthorized = false;
  var req = hh.request(r,parse(function(er, data, res) {
    if (er) {
      // request failed entirely
      console.warn('Fetching downloads failed', res.headers, er)
      cb(null,0)
    }
    else {
      // update the cache when the request completes
      // (even if we already timed out and returned to user)
      console.warn('Fetching downloads completed:')
      console.warn(data.downloads)
      cb(null,data.downloads||0)
    }
  }))
  // but don't wait more than a second for them
  req.on('socket', function (socket) {
    socket.setTimeout(1000);
    socket.on('timeout', function() {
      // we let the request complete, but we call back immediately
      console.warn("Fetching downloads timed out")
      cb(null,0)
    })
  })
  req.end()

}
