/* * spectcl.js: Top-level include for the `spectcl` module.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

'use strict'

var cpSpawn = require('child_process').spawn
  , pty = require('child_pty')
  , events = require('events')
  , through = require('through')
  , util = require('util')
  , extend = require('extend')

var debug = require('debug')('spectcl')

function Spectcl(options){
    if(!(this instanceof Spectcl)){
        return new Spectcl(options)
    }
    options = options || {}
    options.timeout = options.timeout || 30000
    options.matchMax = options.matchMax || 2000

    // Public things here
    /**
     * Output object accessible by the user.
     * buffer contains all data on the stream between the previous two matches.
     * This object is meant to emulate TCL Expect's expect_out behavior.
     * For more, see http://www.tcl.tk/man/expect5.31/expect.1.html
     */
    /*eslint-disable camelcase */
    this.expect_out = {
        buffer: ''
    }
    /*eslint-enable camelcase */

    /**
     * Options object.
     * @property {number} timeout - Max inactivity time, in ms. Defaults to 30s
     * @property {number} matchMax - Max length of cache. Default to 2000
     */
    this.options = options

    /**
     * Spectcl is an emitter.
     */
    this.emitter = new events.EventEmitter()

    /**
     * String containing the data to match against thus far.
     * Subject to matchMax restrictions.
     * Once a match is found, the contents up to the match are flushed to
     * expect_out.buffer.
     */
    this.cache = ''

    /**
     * A buffering stream.  STDOUT/ERR is piped to this stream.
     * Starts out paused, and is resumed when we are expecting, and is
     * paused again when we match.  We also watch this stream for eof.
     */
    this.cacheStream = null

    /**
     * Child object.
     */
    this.child = null

    /**
     * True if this session is currently in an expect block.
     */
    this.expecting = false

    /**
     * Set when the cache string is longer than options.matchMax
     */
    this.fullBuffer = false

    /**
     * Enum values for special handling
     */
    this.EXP_CONTINUE = 'EXP_CONTINUE\u1f4aa'
    this.TIMEOUT = 'EXP_TIMEOUT\u1f4a9'
    this.EOF = 'EXP_EOF\u1f4a5'
    this.FULL_BUFFER = 'FULL_BUFFER\u1f355'

}


/**
 * Spawns the Expect session's child process
 * @param {string|Array} command - The command to spawn.  If string, will be split on ' ' if params not provided.
 * @param {Array} [cmdParams] - Argv to pass to the child process.
 * @param {Object} [cmdOptions] - Options used when spawning the child.
 * @param {Object} [spawnOptions] - Options used when spawning the child.
 * @param {boolean} spawnOptions.noPty - If true, spectcl will spawn the child directly, without obtaining a pty session.
 * @returns {undefined}
 */
Spectcl.prototype.spawn = function (command, cmdParams, cmdOptions, spawnOptions){
    var self = this

    /**
     * Preprocesses the `data` from `child`.
     * Evaluates the processed lines:
     * 1. Stripping ANSI colors (if necessary)
     * 2. Removing case sensitivity (if necessary)
     * @param {String|Object} data - Data to process
     * @fires Spectcl#data
     * @returns {undefined}
     */
    function onData(data) {
        this.queue(data)
        data = data.toString()

        if(self.options.stripColors) {
            data = data.replace(/\u001b\[(\d{0,3};?)+m/g, '')
        }

        if(self.options.ignoreCase) {
            data = data.toLowerCase()
        }

        /**
         * Append to the cache and emit the 'data' event.
         * While it might be of value to users, the event primarily serves
         * to notify expect statements when there is new data on the cache to scan
         */
        self.cache = self.cache.concat(data)
        if(self.cache.length > self.options.matchMax){
            // Naive implementation of matchMax.  Anything after matchMax is lost.
            // This feature will be fully fleshed out and is documented in #25.
            self.fullBuffer = true
            self.cache = self.cache.slice(self.cache.length-self.options.matchMax, self.cache.length)
        }
        self.emit('data', data)
    }

    // Arguments handling
    if (arguments.length === 2) {
        // Did we get a params array or an options object as the second parameter?
        if (Array.isArray(cmdParams)) {
            cmdOptions = {}
        }
        else {
            cmdOptions = cmdParams
            cmdParams = null
        }
    }
    if (Array.isArray(command)) {
        cmdParams = command
        command = cmdParams.shift()
    }
    else if (typeof command === 'string') {
        command = command.split(' ')
        cmdParams = cmdParams || command.slice(1)
        command = command[0]
    } else {
        throw new Error('Could not understand options!')
    }

    spawnOptions = spawnOptions || {}
    debug('[spawn] command:\t%s', command)
    debug('[spawn] cmdParams:\t%s', util.inspect(cmdParams))
    debug('[spawn] cmdOptions:\t%s',util.inspect(cmdOptions))
    debug('[spawn] spawnOptions:\t%s', util.inspect(spawnOptions))

    self.cacheStream = through(onData, function(){
        this.queue(null)
    })

    self.cacheStream.pause()
    debug('[spawn] created cacheStream')

    // At present, child-pty does not expose a stderr stream
    if(spawnOptions.noPty){
        self.child = cpSpawn(command, cmdParams, cmdOptions)
        self.child.stdout.pipe(self.cacheStream)
        self.child.stderr.pipe(self.cacheStream)
    } else {
        cmdOptions = extend({columns: 0, rows: 0}, cmdOptions)
        self.child = pty.spawn(command, cmdParams, cmdOptions)
        self.child.stdout.pipe(self.cacheStream)
        /**
         * `child-pty` stdout/in streams do not emit `end` or `close`.
         * Watch for child to `close` (stdio streams terminated), and
         * queue an end event onto the cache stream.
         */
        self.child.on('close', function(){
            self.cacheStream.end()
        })
        debug('[spawn] child tty:\t'+self.child.stdout.ttyname)
    }

    debug('[spawn] child pid:\t'+self.child.pid)

    self.child.on('error', function(err){
        debug('[spawn] child %d error: '+err,self.child.pid)
        self.emit('error', err)
    })

    self.child.on('exit', function(code, signal){
        debug('[spawn] child %d exit. code: %s\tsignal: %s',self.child.pid,code,signal)
        self.emit('exit', code, signal)
    })

    return
}

/**
 * Called after the expectation matches.
 * @callback Spectcl~expectHandlerCallback
 * @param {string|Object} match - Contains results of RegExp match or String that matched expectation.
 * @params {Function} cb - `cb`
 * @returns {String} Can optionally return Spectcl~EXP_CONTINUE, which will trigger exp_continue-like behavior.
 */

/**
 * Called once a condition is met, or after a match handler is called.
 * @callback Spectcl~expectFinalCallback
 * @param {Object} err - Error object or null
 */

/**
 * Wait until:
 * 1. One of the patterns matches the output of the spawned process
 * 2. A specified time period has passed
 * 3. End-of-file is seen
 * After one of the above conditions is met, the provided callback will be called.
 * @param {Array} expArr - An array of even length, of the form:
 * [{RegExp|String}, {Spectcl~handlerCallback}, {RegExp|String}, {Spectcl~handlerCallback}, ... ]
 * @param {Spectcl~expectFinalCallback} cb - Callback to handle the response
 * @example
 * // Watch for a '#' prompt
 * spectcl.expect([/#/, function(){ // called when we match on /#/ }])
 * @return {undefined}
 */
Spectcl.prototype.expect = function(expArr, cb){
    var self = this
      , expectations = []
      , expectation
      , expectObject = {}
      , expectCallbacks = expArr
      , finalCb = cb || function(){}
      , onEof // function to handle `end` event
      , onTimeout // function to handle timeout case
      , expTimeout // Timeout object
      , dataCallback // Called when we have fresh data from the cache stream
      , match

        /**
         * Scans the cache for a match from the expectation list and handles is appropriately.
         * Looks for a match on the expectations.  If one is found, it will shift the buffer/cache
         * and call its callback with the expectation matched or null if no match is found.
         * Called once ~expectObject and ~expectCallbacks are populated from the arguments array.
         * @returns {String|RegExp|Number} The Expectation that was found in the cache or null if no match was found.
         */
      , matchCache = function(){
          for(var i=0; i<expectations.length; i++){
              var exp = expectations[i]
                , matched
              if(exp === self.FULL_BUFFER && self.fullBuffer){
                  self.cacheStream.pause()
                  self.cacheStream.removeListener('end', onEof)
                  self.expect_out.buffer = self.cache
                  self.cache = ''
                  self.fullBuffer = false
                  matched = self.expect_out.buffer
                  debug('[expect] [%d] match FULL_BUFFER %s', self.child.pid, matched)
                  return expectations[i]
              }
              if(exp instanceof RegExp){
                  matched = exp.exec(self.cache)
                  if(!matched){
                      debug('[expect] [%d] does input match on RegExp pattern "%s"? no', self.child.pid, exp)
                      continue
                  }
                  // We matched, so we need to start the stream buffering again and remove the eof listener.
                  self.cacheStream.pause()
                  self.cacheStream.removeListener('end', onEof)
                  debug('[expect] [%d] does input match on RegExp pattern "%s"? yes', self.child.pid, exp)
                  // Flush *only* the contents up to and including the match to expect_out.buffer
                  self.expect_out.buffer = self.cache.substring(0,matched.index+matched[0].length)
                  self.expect_out.match = matched
                  self.cache = self.cache.substring(matched.index+matched[0].length)
                  self.fullBuffer = false
              } else {
                  var matchIdx = self.cache.indexOf(exp)
                  if(matchIdx === -1){
                      debug('[expect] [%d] does input match on string "%s"? no', self.child.pid,exp)
                      continue
                  }
                  // We matched, so we need to start the stream buffering again and remove the eof listener.
                  self.cacheStream.pause()
                  self.cacheStream.removeListener('end', onEof)
                  debug('[expect] [%d] does input match on string "%s"? yes', self.child.pid,exp)
                  // Flush *only* the contents up to and including the match to expect_out.buffer
                  self.expect_out.buffer = self.cache.substring(0,matchIdx+exp.length)
                  self.expect_out.match = exp
                  self.cache = self.cache.substring(matchIdx+exp.length)
                  self.fullBuffer = false
              }
              return expectations[i]
          }
      }

        /**
         * Called when we've found a match in the cache.
         * If there's a handler for the given expectation, then call it.
         * If not, call the final callback.  Note that the handler can return
         * `EXP_CONTINUE`, which will trigger this expect to be immediately.
         * called again.  The handler can choose to call the final callback
         * If no handler exists for the matched expectation, then the final
         * callback will be called.
         *
         * @param {String|RegExp} matchedExpectation - the expectation on which we matched.
         * @return {undefined}
         */
      , onMatch = function onMatch(matchedExpectation){
          // We matched in this block, so we're this expect block is considered complete.
          self.expecting = false

          var expectationCb = expectObject[matchedExpectation]
            , cbRetVal

          if(expectationCb){
              debug('[expect] [%d] calling handler for %s', self.child.pid, matchedExpectation)
              cbRetVal = expectationCb(matchedExpectation, finalCb)
          } else{
              debug('[expect] [%d] warning: no callback defined for %s', self.child.pid,matchedExpectation)
              return finalCb(null)
          }

          if(cbRetVal === self.EXP_CONTINUE){
              // We are supposed to continue, so call expect again with this invokation's arguments
              debug('[expect] [%d] EXP_CONTINUE', self.child.pid)
              return self.expect(expectCallbacks, finalCb)
          }
      }

    if(!expectCallbacks.length){
        var err = new Error('cannot call expect with empty array')
        self.emit('error', err)
        return
    }

    if(expectCallbacks.length % 2){
        err = new Error('cannot call expect with array that is odd in length')
        self.emit('error', err)
        return
    }

    if(self.expecting){
        err = new Error('Only one Expect block can be evaluated at a time')
        self.emit('error', err)
        return
    }

    self.expecting = true

    // For each expectation/callback pair, add to the current expects object.
    for(var i=0; i<expectCallbacks.length; i+=2){
        expectation = expectCallbacks[i]
        var expCallback = expectCallbacks[i+1]

        // Type checking of expectation/callback pairing
        if(typeof expectation !== 'string' && !(expectation instanceof RegExp)){
            err = new Error('invalid exp (must be string or RegExp): '+expectation)
            self.emit('error', err)
            return
        }
        if(typeof expCallback !== 'function'){
            err = new Error('received non-function as expect callback')
            self.emit('error', err)
            return
        }

        expectations.push(expectation)

        // We only care about the first callback we're given
        if(!expectObject[expectation]){
            expectObject[expectation] = expCallback
        }
    }
    debug('[expect] [%d] expectations: '+Object.keys(expectObject), self.child.pid)

    /**
     * Handles end of readable stream.
     * Remove the data listener and clear the timeout interval.
     * We do this to guarantee that EOF is what is matched.
     * @private
     * @returns {undefined}
     */
    onEof = function(){
        /* istanbul ignore else -- prevent multiple calls */
        if(expTimeout){
            // Found eof, so clear the timeout
            clearTimeout(expTimeout)
            expTimeout = null
        }
        self.removeListener('data', dataCallback)
        debug('[expect] [%d] read eof', self.child.pid)
        onMatch(self.EOF)
    }


    /**
     * Handles timeout case.
     * Remove teh data and eof listeners.
     * We do this to guarantee that TIMEOUT is what is matched.
     * @private
     * @returns {undefined}
     */
    onTimeout = function(){
        self.removeListener('data', dataCallback)
        self.cacheStream.removeListener('end', onEof)
        debug('[expect] [%d] timeout', self.child.pid)
        onMatch(self.TIMEOUT)
    }

    /**
     * Scan the data for a match and handle accordingly.
     * Called when we get fresh data from the child.
     * If a match is found, remove the eof listener
     * If a match is not found, we reset the timeout
     * @private
     * @returns {undefined}
     */
    dataCallback = function(){
        /* istanbul ignore else -- prevent multiple calls */
        if(expTimeout){
            // Found data, so clear the timeout
            clearTimeout(expTimeout)
            expTimeout = null
        }
        match = matchCache()
        if(match){
            debug('[expect] [%d] found match in data', self.child.pid)
            onMatch(match)
            return
        }
        expTimeout = setTimeout(onTimeout, self.options.timeout)
        self.once('data', dataCallback)
    }

    match = matchCache()
    if(match){
        // Match found in initial cache.  Remove eof listener and handle the match.
        debug('[expect] [%d] found match in cache', self.child.pid)
        onMatch(match)
    } else {
        // No match found in the initial sweep of the cache, so scan on subsequent additions
        expTimeout = setTimeout(onTimeout, self.options.timeout)
        self.cacheStream.once('end', onEof)
        self.once('data', dataCallback)
        self.cacheStream.resume()
    }
}


/**
 * Called once a condition is met, or after a match handler is called.
 * @callback Spectcl~sendCallback
 */

/**
 * Sends data to the spawned process
 * @param {string} data - Data to send to the current spawned process.
 * @param {Spectcl~sendCallback} cb - Called once the send is complete.
 * @return {undefined}
 */
Spectcl.prototype.send = function(data, cb){
    debug('[send] writing to child stdin')
    this.child.stdin.write(data, function(){
        debug('[send] wrote to child stdin')
        if(cb){
            return cb()
        }
    })
}


/**
 * Called once a condition is met, or after a match handler is called.
 * @callback Spectcl~sendEofCallback
 */

/**
 * Destroy the spawned process' stdin stream.
 * Useful when working with apps that use inquirer.
 * @param {Spectcl~sendEofCallback} cb - Called once EOF is sent.
 * @return {undefined}
 */
Spectcl.prototype.sendEof = function(cb){
    var self = this
    if(cb){
        self.child.once('close', function(){
            return cb()
        })
    }

    // child_pty requires us to call kill() directly.
    if(self.child.stdout.ttyname){
        debug('[sendEof] kill pty')
        self.child.kill()
    } else {
        debug('[sendEof] destroy sdtin')
        self.child.stdin.destroy()
    }
}


/**
 * Spectcl is an emitter.
 * @return {undefined}
 */
Spectcl.prototype.on = function(){
    return this.emitter.on.apply(this.emitter, arguments)
}


/**
 * Spectcl is an emitter.
 * @return {undefined}
 */
Spectcl.prototype.once = function(){
    return this.emitter.once.apply(this.emitter, arguments)
}


/**
 * Spectcl is an emitter.
 * @return {undefined}
 */
Spectcl.prototype.emit = function(){
    return this.emitter.emit.apply(this.emitter, arguments)
}

/**
 * Spectcl is an emitter.
 * @return {undefined}
 */
Spectcl.prototype.removeListener = function(){
    /* istanbul ignore next */
    return this.emitter.removeListener.apply(this.emitter, arguments)
}

/**
 * Data event.
 * @event Spectcl#data
 * @type {object}
 * @property {String} data - Data coming from the child process' stream(s)
 */

/**
 * Error event.
 * @event Spectcl#error
 * @type {object}
 * @property {Object} err - Error object created during a spectcl session
 */

/**
 * Exit event.
 * @event Spectcl#exit
 * @type {object}
 * @property {Number} code - exit code of child session's PID
 * @property {String} signal - exit signal of child session's PID
 */

module.exports = Spectcl
