v0.6.3 - Oct 4 2016

* Fix issue with exceptions being thrown by `session.send` (Ryan Milbourne)
* Fix issue with events being emitted before listener callbacks are registered (Ryan Milbourne)
* Build: Update dependencies (greenkeeper)

v0.6.2 - May 10 2016

* modify "sendEof" to invoke callback w/o waiting for child stream closure (Ryan Milbourne)
* Build: Update dependencies (greenkeeper)

v0.6.1 - April 8 2016

* Build: Remove unused dependencies, makefile (Greg Cochard)

v0.6.0 - February 2 2016

* "expect" function inserts third parameter to callback, the match result

v0.5.1 - January 28 2016

* Replace variable "expectation" with "exp" in lines 290 and 300-302

v0.4.4 - December 9 2015

* Fix clearing of expTimeout on EOF detection (Ryan Milbourne)
* Build: Update dependencies (greenkeeper)
* Docs: Add twitter badge to README (Greg Cochard)


v0.4.3 - November 24 2015

* Add callbacks to `send` and `sendEof` to support "fire and forget" use (Ryan Milbourne)
* Build: Update dependencies (greenkeeper)
* Docs: Update spectcl.github.io via `docugen` (Ryan Milbourne)
* Docs: Add link to github.io API docs in README.md (Ryan Milbourne)


v0.4.2 - October 17 2015

* Build: Add `debug` output to `test` script (Ryan Milbourne)
* Build: Update dependencies (greenkeeper)
* Build: Fix npm install on node v4 (Greg Cochard)


v0.4.1 - October 9 2015

* Fix #30 (Ryan Milbourne)


v0.4.0 - October 7 2015

* Add support for `eof` and `timeout` (Ryan Milbourne)
* Docs: Update README with `Getting Started` (Ryan Milbourne)


v0.3.1 - September 26 2015

* Docs: Update examples, add reference in README (Ryan Milbourne)


v0.3.0 - September 24 2015

* Add `expect_out.match` property. (Ryan Milbourne)
* Docs: Add `ViaSat, Inc.` to License 2015 Copyright. (Ryan Milbourne)
* Build: Fix `eslint` errors. (Ryan Milbourne)


v0.2.0 - September 18 2015

* Add support for pty sessions. (Ryan Milbourne)


v0.1.0 - September 14 2015

* Rework of API to support more Expect-like syntax. (Ryan Milbourne)
* Build: Modify tests to use mocha. (Ryan Milbourne)
* Build: Add `.istanbul.yml` with coverage thresholds. (Ryan Milbourne)
* Build: Write new tests that use the new control flow. (Ryan Milbourne
* Docs: Update README.md. (Ryan Milbourne)


v0.0.7 - June 6, 2015


v0.0.6 - June 6, 2015

* Docs: Add changelog (Greg Cochard)
* Build: Temporarily disable target.test in makefile (Greg Cochard)
* Build: Add eslintrc and eslint to devDeps (Greg Cochard)
* Build: Fix tests -> test (Greg Cochard)
* Build: Add Makefile.js from Eslint (Greg Cochard)
* Build: Fixing ESLint warnings, introducing Makefile.js (Greg Cochard)
* Add shebang to examples, s/nexpect/spectcl/g (Ryan Milbourne)
* update readme some more (Greg Cochard)
* Update README.md (Ryan Milbourne)

