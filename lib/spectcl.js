/*
 * spectcl.js: Top-level include for the `spectcl` module.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

'use strict'

var spawn = require('child_process').spawn
  , pty = require('child_pty')
  , events = require('events')
  , util = require('util')
  , extend = require('extend')

var debug = require('debug')('spectcl')

module.exports = function Spectcl(options){
    options = options || {}
    // Some private things
    var EXP_CONTINUE = 4

    // Public things here
    return {
        /**
         * Output object accessible by the user.
         * buffer contains all data on the stream between the previous two matches.
         * This object is meant to emulate TCL Expect's expect_out behavior.
         * For more, see http://www.tcl.tk/man/expect5.31/expect.1.html
         */
        /*eslint-disable camelcase */
        expect_out: {
            buffer: ''
        },
        /*eslint-enable camelcase */

        options: options,
        emitter: new events.EventEmitter(),
        cache: '',
        child: null,
        expecting: false,

        // Enum values for special handling
        EXP_CONTINUE:   4,

        /**
         * Spawns the Expect session's child process
         * @param {string|Array} command - The command to spawn.  If string, will be split on ' ' if params not provided.
         * @param {Array} [cmdParams] - Argv to pass to the child process.
         * @param {Object} [cmdOptions] - Options used when spawning the child.
         * @param {Object} [spawnOptions] - Options used when spawning the child.
         * @param {boolean} spawnOptions.noPty - If true, spectcl will spawn the child directly, without obtaining a pty session.
         * @returns {undefined}
         */
        spawn: function(command, cmdParams, cmdOptions, spawnOptions){
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
                if(typeof data !== 'string'){
                    data = data.toString()
                }

                if(self.options.stripColors) {
                    data = data.replace(/\u001b\[\d{0,2}m/g, '')
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
            }

            spawnOptions = spawnOptions || {}
            debug('[spawn] command:\t%s', command)
            debug('[spawn] cmdParams:\t%s', util.inspect(cmdParams))
            debug('[spawn] cmdOptions:\t%s',util.inspect(cmdOptions))
            debug('[spawn] spawnOptions:\t%s', util.inspect(spawnOptions))

            if(spawnOptions.noPty){
                self.child = spawn(command, cmdParams, cmdOptions)
            } else {
                cmdOptions = extend({columns: 0, rows: 0}, cmdOptions)
                self.child = pty.spawn(command, cmdParams, cmdOptions)
                debug('[spawn] child tty:\t'+self.child.stdout.ttyname)
            }
            debug('[spawn] child pid:\t'+self.child.pid)

            self.child.on('error', function(err){
                debug('[spawn] child error: '+err)
                self.emit('error', err)
            })

            self.child.on('exit', function(code, signal){
                debug('[spawn] child exit. code: %s\tsignal: %s',code,signal)
                self.emit('exit', code, signal)
            })

            // TCL Expect watches both stdout and stderr by default
            self.child.stdout.on('data', onData)

            // child_pty does not make stderr avilable at this time.
            if(spawnOptions.noPty){
                self.child.stderr.on('data', onData)
            }

            return
        },


        /**
         * Called after the expectation matches.
         * @callback Spectcl~expectCallback
         * @param {string|Object} match - Contains results of RegExp match or String that matched expectation.
         * @returns {Number} Can optionally return Spectcl~CONTINUE, which will trigger exp_continue-like behavior.
         */

        /**
         * Wait until given pattern matches output of the spanwed process.
         * @param {Array} expArr - An array of even length, of the form:
         * [{RegExp|String}, {Function}, {RegExp|String}, {Function}, ... ]
         * @example
         * // Watch for a '#' prompt
         * spectcl.expect([/#/, function(){ // called when we match on /#/ }])
         * @return {Spectcl~expectCallback} Callback to handle the response
         */
        expect: function(expArr){
            var self = this
              , expectations = []
              , expectation
              , expectObject = {}
              , expectCallbacks = expArr

                /**
                 * Scans the cache for a match from the expectation list and handles is appropriately.
                 * Looks for a match on the expectations.  If one is found, it will shift the buffer/cache
                 * and call its callback with the expectation matched or null if no match is found.
                 * Called once ~expectObject and ~expectCallbacks are populated from the arguments array.
                 * @returns {String|RegExp|Number} The Expectation that was found in the cache or null if no match was found.
                 */
              , matchCache = function scanCache(){
                  for(var i=0; i<expectations.length; i++){
                      var exp = expectations[i]
                      if(exp instanceof RegExp){
                          var match = exp.exec(self.cache)
                          if(!match){
                              continue
                          }
                          // Flush *only* the contents up to and including the match to expect_out.buffer
                          self.expect_out.buffer = self.cache.substring(0,match.index+match[0].length)
                          self.expect_out.match = match
                          self.cache = self.cache.substring(match.index+match[0].length)
                      } else {
                          var matchIdx = self.cache.indexOf(expectation)
                          if(matchIdx === -1){
                              continue
                          }
                          // Flush *only* the contents up to and including the match to expect_out.buffer
                          self.expect_out.buffer = self.cache.substring(0,matchIdx+expectation.length)
                          self.expect_out.match = expectation
                          self.cache = self.cache.substring(matchIdx+expectation.length)
                      }
                      return expectations[i]
                  }
              }

                /**
                 * Called when we've found a match in the cache.
                 * @param {String|RegExp|Number} matchedExpectation - the expectation on which we matched.
                 * @return {undefined}
                 */
              , onMatch = function onMatch(matchedExpectation){
                  // We matched in this block, so we're this expect block is considered complete.
                  self.expecting = false

                  var expectationCb = expectObject[matchedExpectation]
                    , cbRetVal = expectationCb(matchedExpectation)

                  debug('[expect] expect_out:\n'+util.inspect(self.expect_out))
                  if(cbRetVal === EXP_CONTINUE){
                      // We are supposed to continue, so call expect again with this invokation's arguments
                      debug('[expect] EXP_CONTINUE')
                      self.expect(expectCallbacks)
                  }
                  // expectCallbacks = null
                  return
              }

            if(!expectCallbacks.length){
                self.emit('error', new Error('cannot call expect with empty array'))
                return
            }

            if(expectCallbacks.length % 2){
                self.emit('error', new Error('cannot call expect with array that is odd in length'))
                return
            }

            if(self.expecting){
                self.emit('error', new Error('Only one Expect block can be evaluated at a time'))
                return
            }

            self.expecting = true

            // For each expectation/callback pair, add to the current expects object.
            for(var i=0; i<expectCallbacks.length; i+=2){
                expectation = expectCallbacks[i]
                var expCallback = expectCallbacks[i+1]

                // Type checking of expectation/callback pairing
                if(typeof expectation !== 'string' && !(expectation instanceof RegExp)){
                    self.emit('error', new Error('invalid exp (must be string or RegExp): '+expectation))
                    return
                }
                if(typeof expCallback !== 'function'){
                    self.emit('error', new Error('received non-function as expect callback'))
                    return
                }

                expectations.push(expectation)

                // We only care about the first callback we're given
                if(!expectObject[expectation]){
                    expectObject[expectation] = expCallback
                }
            }
            debug('[expect] expectations: '+Object.keys(expectObject))

            // Do an initial scan of the cache looking for our match
            var match = matchCache()
            if(match){
                debug('[expect] found match in cache')
                onMatch(match)
                return
            }

            function dataCallback(){
                match = matchCache()
                if(match){
                    debug('[expect] found match in data')
                    onMatch(match)
                    return
                }
                self.once('data', dataCallback)
            }

            // No match found in the initial sweep of the cache, so scan on subsequent additions
            self.once('data', dataCallback)
        },


        /**
         * Sends data to the spawned process
         * @param {string} data - Data to send to the current spawned process.
         * @return {undefined}
         */
        send: function(data){
            debug('[send] writing to child stdin')
            this.child.stdin.write(data, function(){
                return
            })
        },


        /**
         * Destroy the spawned process' stdin stream.
         * Useful when working with apps that use inquirer.
         * @return {undefined}
         */
        sendEof: function(){
            var self = this
            // child_pty requires us to call kill() directly.
            if(self.child.stdout.ttyname){
                debug('[sendEof] kill pty')
                self.child.kill()
            } else {
                debug('[sendEof] destroy sdtin')
                self.child.stdin.destroy()
            }
            return
        },


        /**
         * Spectcl is an emitter.
         * @return {undefined}
         */
        on: function(){
            return this.emitter.on.apply(this.emitter, arguments)
        },


        /**
         * Spectcl is an emitter.
         * @return {undefined}
         */
        once: function(){
            return this.emitter.once.apply(this.emitter, arguments)
        },


        /**
         * Spectcl is an emitter.
         * @return {undefined}
         */
        emit: function(){
            return this.emitter.emit.apply(this.emitter, arguments)
        },

        /**
         * Spectcl is an emitter.
         */

        removeListener: function(){
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
    }
}

