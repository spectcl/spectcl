'use strict'
/*
 * spectcl.js: Top-level include for the `spectcl` module.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var spawn = require('child_process').spawn
  , util = require('util')
  , AssertionError = require('assert').AssertionError
  , events = require('events')

module.exports = function Spectcl(options){
    options = options || {}
    //Some private things
    var EXP_CONTINUE = 4
    //var child
    //  , cache = ''
    //  , emitter = new events.EventEmitter()

    //Public things here
    return {
        /**
         * Output object accessible by the user.
         * buffer contains all data on the stream between the previous two matches.
         * This object is meant to emulate TCL Expect's expect_out behavior.
         * For more, see http://www.tcl.tk/man/expect5.31/expect.1.html
         */
        expect_out: {
            buffer: ''
        },

        options: options,
        emitter: new events.EventEmitter(),
        cache: '',
        child: null,


        /**
         * Spawns the Expect session's child process
         * @param {string|Array} command - The command to spawn.  If string, will be split on ' ' if params not provided.
         * @param {Array} [cmdParams] - Argv to pass to the child process.
         * @param {Object} [cmdOptions] - Options used when spawning the child.
         */
        spawn: function(command, cmdParams, cmdOptions){
            var self = this

            /**
             * Preprocesses the `data` from `child`.
             * Evaluates the processed lines:
             * 1. Stripping ANSI colors (if necessary)
             * 2. Removing case sensitivity (if necessary)
             * @params {String|Object} data - Data to process
             * @fires Spectcl#data
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

                //Append to the cache and emit the 'data' event.
                //While it might be of value to users, the event primarily serves
                //to notify expect statements when there is new data on the cache to scan
                self.cache = self.cache.concat(data)
                self.emit('data', data)
            }

            //Arguments handling
            if (arguments.length === 2) {
                //Did we get a params array or an options object as the second parameter?
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

            self.child = spawn(command, cmdParams, cmdOptions)

            self.child.on('error', function(err){
                self.emit(err)
            })

            self.child.on('close', function(code, signal){
                if (code === 127) {
                    // Not how node works (anymore?), 127 is what /bin/sh returns,
                    // but it appears node does not, or not in all conditions, blithely
                    // return 127 to user, it emits an 'error' from the child_process.

                    //
                    // If the response code is `127` then `context.command` was not found.
                    //
                    self.emit(new Error('command not found: '+command))
                    return
                }
                self.emit('close', code, signal)
            })

            //TCL Expect watches both stdout and stderr by default
            self.child.stdout.on('data', onData)
            self.child.stderr.on('data', onData)
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
         * *Syncronous*
         * @param {string|Object} expectation - String or RegExp object containing pattern to match.
         * @param {Spectcl~expectCallback} callback - Callback to call upon match
         * @param {...string|Object} expectationN - expect takes one or more pairs of expectations/callbacks.
         * @param {...Spectcl~expectCallback} callbackN - expect takes one or more pairs of expectations/callbacks.
         */
        expect: function(expArr){
            var self = this
              , expectations = []
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
                            //Flush *only* the contents up to and including the match to expect_out.buffer
                            self.expect_out.buffer = self.cache.substring(0,match.index+match[0].length)
                            self.cache = self.cache.substring(match.index+match[0].length)
                            return expectations[i]
                        } else {
                            var matchIdx = cache.indexOf(expectation)
                            if(matchIdx === -1){
                                continue
                            }
                            //Flush *only* the contents up to and including the match to expect_out.buffer
                            self.expect_out.buffer = self.cache.substring(0,matchIdx+expectation.length)
                            self.cache = self.cache.substring(matchIdx+expectation.length)
                            return expectations[i]
                        }
                    }
                    return 
                }

                /**
                 * Called when we've found a match in the cache.
                 * @params {String|RegExp|Number} the expectation on which we matched.
                 */
              , onMatch = function onMatch(matchedExpectation){
                    var expectationCb = expectObject[matchedExpectation]
                      , cbRetVal = expectationCb()
                    if(cbRetVal === EXP_CONTINUE){
                        //we are supposed to continue, so call expect again with this invokation's arguments
                        //console.log('[expect] EXP_CONTINUE');
                        self.expect(expectCallbacks)
                    }
                    //expectCallbacks = null
                    return
                }

            if(!expectCallbacks.length){
                return
            }

            //console.log('[expect] callbacks:\t'+util.inspect(expectCallbacks));

            //TODO: Add expect_after handling here

            //For each expectation/callback pair, add to the current expects object.
            for(var i=0; i<expectCallbacks.length; i+=2){
                var expectation = expectCallbacks[i]
                  , expCallback = expectCallbacks[i+1]

                //Type checking of expectation/callback pairing
                if(typeof expectation !== 'string' && !(expectation instanceof RegExp)){
                    self.emit('error', new Error('invalid exp (must be string or RegExp): '+expectation))
                    return
                }
                if(typeof expCallback !== 'function'){
                    self.emit('error', new Error('received non-function as expect callback'))
                    return
                }

                //TODO: Add special spectcl.TIMEOUT|EOF|ETC enumerated types

                expectations.push(expectation)

                //We only care about the first callback we're given
                if(!expectObject[expectation]){
                    expectObject[expectation] = expCallback
                }
            }
            //console.log('[expect] expectations: '+Object.keys(expectObject));
            //console.log('[expect] matching on %s expectations', Object.keys(expectObject).length);

            //TODO: Add expect_after handling here

            //Do an initial scan of the cache looking for our match
            var match = matchCache()
            if(match){
                //console.log('[expect] found match in cache');
                onMatch(match)
                return
            }

            function dataCallback(){
                match = matchCache()
                if(match){
                    //console.log('[expect] found match in data')
                    onMatch(match)
                    return
                }
                self.once('data', dataCallback);
            }

            //No match found in the initial sweep of the cache, so scan on subsequent additions
            self.once('data', dataCallback)
        },


        /**
         * Sends data to the spawned process
         * @param {string} data - Data to send to the current spawned process.
         */
        send: function(data){
            this.child.stdin.write(data)
            return
        },


        /**
         * Destroy the spawned process' stdin stream.
         * Useful when working with apps that use inquirer.
         */
        sendEof: function(){
            this.child.stdin.destroy()
            return
        },


        /**
         * Spectcl is an emitter.
         */
        on: function(){
            return this.emitter.on.apply(this.emitter, arguments)
        },


        /**
         * Spectcl is an emitter.
         */
        once: function(){
            return this.emitter.once.apply(this.emitter, arguments)
        },


        /**
         * Spectcl is an emitter.
         */
        emit: function(){
            return this.emitter.emit.apply(this.emitter, arguments)
        },


        /**
         * Spectcl is an emitter.
         */
        removeListener: function(){
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
         * @property {Object} err - Error object
         */
    }
}

function chain (context) {
    return {
        run: function (callback) {
            var errState = null,
                responded = false,
                stdout = [],
                cache = '',
                options,
                self = this;

            //
            // **flushQueue**
            //
            // Helper function which flushes any remaining functions from
            // `context.queue` and responds to the `callback` accordingly.
            //
            function flushQueue () {
                var remainingQueue = context.queue.slice(),
                    currentFn = context.queue.shift(),
                    lastLine = stdout[stdout.length - 1]

                if (!lastLine) {
                    onError(createUnexpectedEndError(
                        'No data from child with non-empty queue.', remainingQueue))
                    return false
                }

                if (context.queue.length > 0) {
                    onError(createUnexpectedEndError(
                        'Non-empty queue on spawn exit.', remainingQueue))
                    return false
                }

                if (!validateFnType(currentFn)) {
                    // onError was called
                    return false
                }

                if (currentFn.name === '_sendline') {
                    onError(new Error(
                        'Cannot call sendline after the process has exited'))
                    return false
                }

                if (currentFn.name === '_wait' || currentFn.name === '_expect') {
                    if (currentFn(lastLine) !== true) {
                        onError(createExpectationError(currentFn.expectation, lastLine))
                        return false
                    }
                }

                return true
            }

            //
            // **onData**
            //
            // Helper function for writing any data from a stream
            // to `process.stdout`.
            //
            function onData (data) {
                process.stdout.write(data)
            }

            options = {
                cwd: context.cwd,
                env: context.env
            }

            //
            // Spawn the child process and begin processing the target
            // stream for this chain.
            //
            context.process = spawn(context.command, context.params, options)

            if (context.verbose) {
                context.process.stdout.on('data', onData)
                context.process.stderr.on('data', onData)
            }

            if (context.stream === 'all') {
                context.process.stdout.on('data', onLine)
                context.process.stderr.on('data', onLine)
            } else {
                context.process[context.stream].on('data', onLine)
            }

            context.process.on('error', onError)

            //
            // When the process exits, check the output `code` and `signal`,
            // flush `context.queue` (if necessary) and respond to the callback
            // appropriately.
            //
            context.process.on('close', function (code, signal) {
                if (code === 127) {
                    // Not how node works (anymore?), 127 is what /bin/sh returns,
                    // but it appears node does not, or not in all conditions, blithely
                    // return 127 to user, it emits an 'error' from the child_process.

                    //
                    // If the response code is `127` then `context.command` was not found.
                    //
                    return onError(new Error('Command not found: ' + context.command))
                }

                if (context.queue.length && !flushQueue()) {
                    // if flushQueue returned false, onError was called
                    return
                } return callback(null, stdout, signal || code) })

            return context
        }
    }
}

function spectcl (command, params, options) {
    if (arguments.length === 2) {
        // Did we get a params array or an options object as the second parameter?
        if (Array.isArray(params)) {
            options = {}
        }
        else {
            options = params
            params = null
        }
    }

    if (Array.isArray(command)) {
        params = command
        command = params.shift()
    }
    else if (typeof command === 'string') {
        command = command.split(' ')
        params = params || command.slice(1)
        command = command[0]
    }

    options = options || {}
    var context = {
        command: command,
        cwd: options.cwd || undefined,
        env: options.env || undefined,
        ignoreCase: options.ignoreCase,
        params: params,
        queue: [],
        expect_out: { buffer: '' },
        stream: options.stream || 'stdout',
        stripColors: options.stripColors,
        verbose: options.verbose
    }
    var _emitter = new EventEmitter()
    context._emitter = _emitter
    context.on = function(){
        _emitter.on.apply(_emitter,arguments)
    }
    context.once = function(){
        _emitter.once.apply(_emitter,arguments)
    }
    context.emit = function(){
        _emitter.emit.apply(_emitter,arguments)
    }

    return chain(context)
}

