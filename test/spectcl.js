/* eslint-env node, mocha */

'use strict'

var assert = require('assert')
  , path = require('path')
  , Spectcl = require('../lib/spectcl')

describe('spectcl', function(){
    describe('spawn', function(){
        it('should spawn a known command without emitting an error', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: %s',err)
            })
            session.on('exit', function(){
                done()
            })
            session.spawn('ls')
        })

        it('should spawn with a command string', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: %s',err)
            })
            session.on('exit', function(){
                done()
            })
            session.spawn('echo hello')
        })

        it('should spawn with a command string and args array', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: %s', err)
            })
            session.on('exit', function(code){
                assert.equal(code, 0, 'non-0 return code')
                done()
            })
            session.spawn('echo', ['hello'])
        })

        it('should spawn without pty when `noPty` set to true', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: '+err)
            })
            session.on('exit', function(code){
                assert.equal(0, code, 'child exited with non-0 return code')
                done()
            })
            session.spawn('echo', ['hello'], {}, {noPty: true})
            assert.equal(session.child.ttyname, undefined, 'child was spawned with a pty session')
        })

        it('should emit `error` event when command cannot be spawned', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.notEqual(null, err, 'recieved null error object')
                done()
            })
            session.spawn('defnotacommand')
        })

        it('should emit `error` event when command cannot be spawned with `noPty`', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.notEqual(null, err, 'recieved null error object')
                done()
            })
            session.spawn('defnotacommand', [], {}, {noPty:true})
        })

        it('should emit `exit` event when child exits', function(done){
            var session = new Spectcl()
            session.on('exit', function(code){
                assert.equal(code, 0, 'non-0 return code')
                done()
            })
            session.spawn('echo hello')
        })
    })

    describe('expect', function(){
        it('should expect and match on a String', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.expect([
                'hello', function(match, cb){
                    cb(null, 'hello')
                }
            ], function(err, data){
                assert.equal(err, null, 'unexpected err in final callback')
                assert.equal(data, 'hello', 'final callback was called by function other than expecation handler')
                done()
            })
        })

        it('should expect and match on a RegExp', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.expect([
                /hello/, function(match, cb){
                    cb(null, 'hello')
                }
            ], function(err, data){
                assert.equal(err, null, 'unexpected err in final callback')
                assert.equal(data, 'hello', 'final callback was called by function other than expecation handler')
                done()
            })
        })

        it('should match on content already in the session cache', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            // Wait so that `hello` is for sure in the cache, and not read in as data
            setTimeout(function(){
                session.expect([
                    /hello/, function(match, cb){
                        cb(null, 'hello')
                    }
                ], function(err, data){
                    assert.ifError(err)
                    assert.equal(data, 'hello')
                    done()
                })
            }, 1000)
        })

        it('should populate expect_out object when match is found', function(done){
            var session = new Spectcl()
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    assert.notEqual(session.expect_out.match, null, 'null expect_out match')
                    assert.notEqual(session.expect_out.buffer, '', 'empty expect_out buffer')
                    session.send('process.exit()\r')
                    done()
                }
            ])
        })

        it('should emit error when given a non-String or non-RegExp parameter', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.notEqual(null, err, 'received null error object')
                done()
            })
            session.expect([
                1, function(){
                    assert.fail('unexpected match')
                }
            ])
        })

        it('should emit error when given non-function as expect callback', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.notEqual(null, err, 'received null error object')
                done()
            })
            session.expect([
                'foo', 'bar'
            ])

        })

        it('should emit error when given non-even expectations array', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.equal('cannot call expect with array that is odd in length', err.message, 'received unexpected error')
                done()
            })
            session.expect([
                'foo', function(){}, 'bar'
            ])
        })

        it('should emit error when given empty expectations array', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.equal('cannot call expect with empty array', err.message, 'received unexpected error')
                done()
            })
            session.expect([])
        })

        it('should emit error when calling expect() when already expecting', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.notEqual(null, err, 'received null error object')
                done()
            })
            session.expect([
                'foo', function(match){
                    assert.fail(match, 'error', 'should have thrown an error, not matched.')
                }
            ])
            session.expect([
                /foo/, function(match){
                    assert.fail(match, 'error', 'should have thrown an error, not matched.')
                }
            ])
        })

        it('should call the final callback after match handler has been called', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('echo hello')
            session.expect([
                /hello/, function(match, cb){
                    cb(null, 'hello')
                }
            ], function(err, data){
                assert.ifError(err)
                assert.equal(data, 'hello')
                done()
            })
        })

        it('should implement EXP_CONTINUE', function(done){
            var session = new Spectcl()
            session.spawn('bash '+path.join(__dirname,'fixtures/test_exp_continue.sh'))
            session.expect([
                /\$/, function(match, cb){
                    session.send('exit\n')
                    cb(null, 'done')
                },
                /assword/, function(){
                    session.send('bar\n')
                    return session.EXP_CONTINUE
                },
                /user/, function(){
                    session.send('foo\n')
                    return session.EXP_CONTINUE
                }
            ], function(err, data){
                assert.equal(err, null, 'unexpected error in final callback')
                assert.equal(data, 'done')
                done()
            })
        })

        it('should expect and match on TIMEOUT', function(done){
            var session = new Spectcl({timeout: 2000})
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('node --interactive')
            session.expect([
                'foo', function(){
                    session.send('process.exit()\r')
                    assert.fail('unexpected match')
                },
                session.TIMEOUT, function(match, cb){
                    cb(new Error('timeout'))
                }
            ], function(err){
                assert.equal(err.message, 'timeout', 'received non-timeout error')
                session.send('process.exit()\r')
                done()
            })
        })

        it('should call the final callback on TIMEOUT when no TIMEOUT expectation is specified', function(done){
            var session = new Spectcl({timeout: 2000})
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('node --interactive')
            session.expect([
                'foo', function(){
                    session.send('process.exit()\r')
                    assert.fail('unexpected match')
                }
            ], function(err){
                assert.ifError(err)
                session.send('process.exit()\r')
                done()
            })
        })

        it('should expect and match on FULL_BUFFER', function(done){
            var session = new Spectcl({matchMax: 5})
            session.spawn('echo thequickbrownfoxjumpsoverthelazydog')
            session.expect([
                session.FULL_BUFFER, function(match, cb){
                    cb(new Error('full buffer'))
                }
            ], function(err){
                assert.equal(err.message, 'full buffer', 'unexpected error: '+err)
                done()
            })
        })

        it('should expect and match on EOF', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('echo hello')
            session.expect([
                session.EOF, function(match, cb){
                    cb(new Error('eof'))
                }
            ], function(err){
                assert.equal(err.message, 'eof', 'received non-eof error in final callback')
                done()
            })
        })

        it('should expect and match on EOF when `noPty` enabled', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('echo', ['hello'], {}, {noPty: true})
            session.expect([
                session.EOF, function(match, cb){
                    cb(new Error('eof'))
                }
            ], function(err){
                assert.equal(err.message, 'eof', 'received non-eof error in final callback')
                done()
            })
        })

        it('should call the final callback on EOF when no EOF expectation is specified', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.expect([
                /goodbye/, function(){
                    assert.fail('unexpected match')
                }
            ], function(err){
                assert.ifError(err)
                done()
            })
        })
    })

    describe('send', function(){
        it('should call the cb once data has been written to child', function(done){
            var session = new Spectcl()
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    assert.notEqual(session.expect_out.match, null, 'null expect_out match')
                    assert.notEqual(session.expect_out.buffer, '', 'empty expect_out buffer')
                    session.send('process.exit()\r', function(){
                        session.child.on('exit', function(){
                            done()
                        })
                    })
                }
            ])
        })
    })

    describe('sendEof', function(){
        it('should kill the child process, emitting an exit event', function(done){
            var session = new Spectcl()
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    session.on('exit', function(){
                        done()
                    })
                    session.sendEof()
                }
            ])
        })

        it('should call the callback when given one', function(done){
            var session = new Spectcl()
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    session.sendEof(function(){
                        done()
                    })
                }
            ])
        })

        it('should kill the child process, emitting an exit event, when `noPty` enabled', function(done){
            var session = new Spectcl()
            session.on('exit', function(){
                done()
            })
            session.on('error', function(err){
                assert.fail('unexpected error: '+err)
            })
            session.spawn('node', ['--interactive'], {}, {noPty:true})
            session.expect([
                '>', function(){
                    session.sendEof()
                }
            ])
        })
    })
})
