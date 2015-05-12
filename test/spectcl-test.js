/*
 * spectcl-test.js: Tests for the `spectcl` module.
 *
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    spawn = require('child_process').spawn,
    spectcl = require('../lib/spectcl');

function assertSpawn (expect) {
  return {
    topic: function () {
      expect.run(this.callback);
    },
    "should respond with no error": function (err, stdout) {
      assert.isTrue(!err);
      assert.isArray(stdout);
    }
  };
}

function assertError (expect) {
  return {
    topic: function () {
      expect.run(this.callback.bind(this, null));
    },
    "should respond with error": function (err) {
      assert.isObject(err);
    }
  };
}

vows.describe('spectcl').addBatch({
  "When using the spectcl module": {
    "it should have the correct methods defined": function () {
      assert.isFunction(spectcl.spawn);
    },
    "spawning": {
      "`echo hello`": assertSpawn(
        spectcl.spawn("echo", ["hello"])
               .expect("hello")
      ),
      "`ls -l /tmp/undefined`": assertSpawn(
        spectcl.spawn("ls -la /tmp/undefined", { stream: 'stderr' })
               .expect("No such file or directory")
      ),
      "a command that does not exist": assertError(
        spectcl.spawn("idontexist")
               .expect("This will never work")
      ),
      "and using the sendline() method": assertSpawn(
        spectcl.spawn("node --interactive")
              .expect(">")
              .sendline("console.log('testing')")
              .expect("testing")
              .sendline("process.exit()")
      ),
      "and using the event driven method": {
          "should respond with no error": function () {
            child = spectcl.spawn('node', ['--interactive']);
            child.run(function(err,stdout,exitcode){
                assert.isTrue(!err);
                assert.isArray(stdout);
            });
            child.on('wait',function(data){
                if(data === '>'){
                    child.sendline('console.log("testing")').wait('testing');
                } else if (data === 'testing'){
                    child.sendline('process.exit()');
                }
            });
            child.wait('>');
        }
      },
      "and using the expect() method": {
        "when RegExp expectation is met": assertSpawn(
          spectcl.spawn("echo", ["hello"])
                 .expect(/^hello$/)
        ),
      },
      "and using the wait() method": {
        "when assertions are met": assertSpawn(
          spectcl.spawn(path.join(__dirname, 'fixtures', 'prompt-and-respond'))
                 .wait('first')
                 .sendline('first-prompt')
                 .expect('first-prompt')
                 .wait('second')
                 .sendline('second-prompt')
                 .expect('second-prompt')
        ),
        "when the last assertion is never met": assertError(
          spectcl.spawn(path.join(__dirname, 'fixtures', 'prompt-and-respond'))
                 .wait('first')
                 .sendline('first-prompt')
                 .expect('first-prompt')
                 .wait('second')
                 .sendline('second-prompt')
                 .wait('this-never-shows-up')
        )
      },
      "when options.stripColors is set": assertSpawn(
        spectcl.spawn(path.join(__dirname, 'fixtures', 'log-colors'), { stripColors: true })
               .wait('second has colors')
               .expect('third has colors')
      ),
      "when options.ignoreCase is set": assertSpawn(
        spectcl.spawn(path.join(__dirname, 'fixtures', 'multiple-cases'), { ignoreCase: true })
               .wait('this has many cases')
               .expect('this also has many cases')
      ),
      "when options.cwd is set": assertSpawn(
        spectcl.spawn(path.join(__dirname, 'fixtures', 'show-cwd'), { cwd: path.join(__dirname, 'fixtures') })
               .wait(path.join(__dirname, 'fixtures'))
      ),
      "when options.env is set": assertSpawn(
        spectcl.spawn(path.join(__dirname, 'fixtures', 'show-env'), { env: { foo: 'bar', PATH: process.env.PATH }})
          .expect('foo=bar')
      )
    }
  }
}).export(module);
