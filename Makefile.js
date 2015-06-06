/**
 * @fileoverview Build file
 * @author nzakas
 */
/*global cat, cd, cp, echo, exec, exit, find, ls, mkdir, mv, pwd, rm, target, test*/

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

require("shelljs/make");

var path = require("path"),
    checker = require("npm-license"),
    dateformat = require("dateformat"),
    markdownlint = require("markdownlint"),
    nodeCLI = require("shelljs-nodecli"),
    os = require("os"),
    semver = require("semver"),
    ghGot = require("gh-got");

//------------------------------------------------------------------------------
// Settings
//------------------------------------------------------------------------------

/*
 * A little bit fuzzy. My computer has a first CPU speed of 3093 and the perf test
 * always completes in < 2000ms. However, Travis is less predictable due to
 * multiple different VM types. So I'm fudging this for now in the hopes that it
 * at least provides some sort of useful signal.
 */
var PERF_MULTIPLIER = 7.5e6;

var OPEN_SOURCE_LICENSES = [
    /MIT/, /BSD/, /Apache/, /ISC/, /WTF/, /Public Domain/
];

//------------------------------------------------------------------------------
// Data
//------------------------------------------------------------------------------

var NODE = "node ", // intentional extra space
    NODE_MODULES = "./node_modules/",
    TEMP_DIR = "./tmp/",
    DOCS_DIR = "../spectcl.github.io/docs",
    SITE_DIR = "../spectcl.github.io/",

    // Utilities - intentional extra space at the end of each string
    MOCHA = NODE_MODULES + "mocha/bin/_mocha ",
    ESLINT = NODE + " " + NODE_MODULES + ".bin/eslint ",

    // Files
    MAKEFILE = "./Makefile.js",
    /*eslint-disable no-use-before-define */
    JS_FILES = find("lib/").filter(fileType("js")).join(" "),
    JSON_FILES = ".eslintrc",
    //MARKDOWN_FILES_ARRAY = find("docs/").concat(ls(".")).filter(fileType("md")),
    TEST_FILES = find("test/").filter(fileType("js")).join(" ");
    /*eslint-enable no-use-before-define */

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Generates a function that matches files with a particular extension.
 * @param {string} extension The file extension (i.e. "js")
 * @returns {Function} The function to pass into a filter method.
 * @private
 */
function fileType(extension) {
    return function(filename) {
        return filename.substring(filename.lastIndexOf(".") + 1) === extension;
    };
}

/**
 * Executes a command and returns the output instead of printing it to stdout.
 * @param {string} cmd The command string to execute.
 * @returns {string} The result of the executed command.
 */
function execSilent(cmd) {
    return exec(cmd, { silent: true }).output;
}

/**
 * Creates a release version tag and pushes to origin.
 * @param {string} type The type of release to do (patch, minor, major)
 * @returns {void}
 */
function release(type) {
    var newVersion, changes;

    target.test();
    echo("Generating new version");
    newVersion = execSilent("npm version " + type).trim();

    echo("Generating changelog");
    changes = target.changelog();

    // add changelog to commit
    exec("git add CHANGELOG.md");
    exec("git commit --amend --no-edit");

    // replace existing tag
    exec("git tag -f " + newVersion);

    // push all the things
    echo("Publishing to git");
    exec("git push origin master --tags");

    // now push the changelog...changes to the tag
    echo("Publishing changes to github release");
    // this requires a github API token in process.env.SPECTCL_GITHUB_TOKEN
    // it will continue with an error message logged if not set
    ghGot("repos/spectcl/spectcl/releases", {
        body: JSON.stringify({
            "tag_name": newVersion,
            name: newVersion,
            "target_commitish": "master",
            body: changes
        }),
        method: "POST",
        json: true,
        token: process.env.SPECTCL_GITHUB_TOKEN
    }, function(pubErr) {
        if (pubErr) {
            echo("Warning: error when publishing changes to github release: " + pubErr.message);
        }
        echo("Publishing to npm");
        exec("npm publish");

        //echo("Generating site");
        //target.gensite();
        //target.publishsite();
    });
}

/**
 * Splits a command result to separate lines.
 * @param {string} result The command result string.
 * @returns {array} The separated lines.
 */
function splitCommandResultToLines(result) {
    return result.trim().split("\n");
}

/**
 * Gets the first commit sha of the given file.
 * @param {string} filePath The file path which should be checked.
 * @returns {string} The commit sha.
 */
function getFirstCommitOfFile(filePath) {
    var commits = execSilent("git rev-list HEAD -- " + filePath);

    commits = splitCommandResultToLines(commits);
    return commits[commits.length - 1].trim();
}

/**
 * Gets the tag name where a given file was introduced first.
 * @param {string} filePath The file path to check.
 * @returns {string} The tag name.
 */
function getTagOfFirstOccurrence(filePath) {
    var firstCommit = getFirstCommitOfFile(filePath),
        tags = execSilent("git tag --contains " + firstCommit);

    tags = splitCommandResultToLines(tags);
    return tags.reduce(function(list, version) {
        version = semver.valid(version.trim());
        if (version) {
            list.push(version);
        }
        return list;
    }, []).sort(semver.compare)[0];
}

/**
 * Gets the version number where a given file was introduced first.
 * @param {string} filePath The file path to check.
 * @returns {string} The version number.
 */
function getFirstVersionOfFile(filePath) {
    return getTagOfFirstOccurrence(filePath);
}

function getVersionTags() {
    var tags = splitCommandResultToLines(exec("git tag", { silent: true }).output);

    return tags.reduce(function(list, tag) {
        if (semver.valid(tag)) {
            list.push(tag);
        }
        return list;
    }, []).sort(semver.compare);
}

/**
 * Lints Markdown files.
 * @param {array} files Array of file names to lint.
 * @returns {object} exec-style exit code object.
 * @private
 */
/*
function lintMarkdown(files) {
    var config = {
            default: true,
            // Exclusions for deliberate/widespread violations
            MD002: false, // First header should be a h1 header
            MD004: {      // Unordered list style
                style: "asterisk"
            },
            MD007: {      // Unordered list indentation
                indent: 4
            },
            MD012: false, // Multiple consecutive blank lines
            MD013: false, // Line length
            MD026: false, // Trailing punctuation in header
            MD029: false, // Ordered list item prefix
            MD034: false  // Bare URL used
        },
        result = markdownlint.sync({
            files: files,
            config: config
        }),
        resultString = result.toString(),
        returnCode = resultString ? 1 : 0;
    if (resultString) {
        console.error(resultString);
    }
    return { code: returnCode };
}
*/

//------------------------------------------------------------------------------
// Tasks
//------------------------------------------------------------------------------

target.all = function() {
    target.test();
};

target.lint = function() {
    var errors = 0,
        lastReturn;

    echo("Validating Makefile.js");
    lastReturn = exec(ESLINT + MAKEFILE);
    if (lastReturn.code !== 0) {
        errors++;
    }

    echo("Validating JSON Files");
    lastReturn = nodeCLI.exec("jsonlint", "-q -c", JSON_FILES);
    if (lastReturn.code !== 0) {
        errors++;
    }

    /*
    echo("Validating Markdown Files");
    lastReturn = lintMarkdown(MARKDOWN_FILES_ARRAY);
    if (lastReturn.code !== 0) {
        errors++;
    }
    */

    echo("Validating JavaScript files");
    lastReturn = exec(ESLINT + JS_FILES);
    if (lastReturn.code !== 0) {
        errors++;
    }

    echo("Validating JavaScript test files");
    lastReturn = exec(ESLINT + TEST_FILES);
    if (lastReturn.code !== 0) {
        errors++;
    }

    if (errors) {
        exit(1);
    }
};

target.test = function() {
    target.lint();
    target.checkRuleFiles();
    var errors = 0,
        lastReturn;

    // exec(ISTANBUL + " cover " + MOCHA + "-- -c " + TEST_FILES);
    lastReturn = nodeCLI.exec("istanbul", "cover", MOCHA, "-- -R progress -c", TEST_FILES);
    if (lastReturn.code !== 0) {
        errors++;
    }

    // exec(ISTANBUL + "check-coverage --statement 99 --branch 98 --function 99 --lines 99");
    lastReturn = nodeCLI.exec("istanbul", "check-coverage", "--statement 99 --branch 98 --function 99 --lines 99");
    if (lastReturn.code !== 0) {
        errors++;
    }

    if (errors) {
        exit(1);
    }

    target.checkLicenses();
};

target.docs = function() {
    echo("Generating documentation");
    nodeCLI.exec("jsdoc", "-d jsdoc lib");
    echo("Documentation has been output to /jsdoc");
};

target.gensite = function() {
    echo("Generating spectcl.org");

    var docFiles = [
        "/user-guide/command-line-interface.md",
        "/user-guide/configuring.md",
        "/developer-guide/nodejs-api.md",
        "/developer-guide/working-with-plugins.md",
        "/developer-guide/working-with-rules.md"
    ];

    // 1. create temp and build directory
    if (!test("-d", TEMP_DIR)) {
        mkdir(TEMP_DIR);
    }

    // 2. remove old files from the site
    docFiles.forEach(function(filePath) {
        var fullPath = path.join(DOCS_DIR, filePath),
            htmlFullPath = fullPath.replace(".md", ".html");

        if (test("-f", fullPath)) {

            rm("-r", fullPath);

            if (filePath.indexOf(".md") >= 0 && test("-f", htmlFullPath)) {
                rm("-r", htmlFullPath);
            }
        }
    });

    // 3. Copy docs folder to a temporary directory
    cp("-rf", "docs/*", TEMP_DIR);

    var versions = test("-f", "./versions.json") ? JSON.parse(cat("./versions.json")) : {};

    // 4. Loop through all files in temporary directory
    find(TEMP_DIR).forEach(function(filename) {
        if (test("-f", filename)) {
            var docsUrl = "https://github.com/spectcl/spectcl/tree/master/docs/rules/";

            var text = cat(filename);

            var baseName = path.basename(filename);
            var sourceBaseName = path.basename(filename, ".md") + ".js";
            var ruleName = path.basename(filename, ".md");

            // 5. Prepend page title and layout variables at the top of rules
            if (path.dirname(filename).indexOf("rules") >= 0) {
                text = "---\ntitle: " + (ruleName === "README" ? "List of available rules" : "Rule " + ruleName) + "\nlayout: doc\n---\n<!-- Note: No pull requests accepted for this file. See README.md in the root directory for details. -->\n" + text;
            } else {
                text = "---\ntitle: Documentation\nlayout: doc\n---\n<!-- Note: No pull requests accepted for this file. See README.md in the root directory for details. -->\n" + text;
            }

            // 6. Remove .md extension for links and change README to empty string
            text = text.replace(/\.md(.*?\))/g, ")").replace("README.html", "");

            // 7. Check if there's a trailing white line at the end of the file, if there isn't one, add it
            if (!/\n$/.test(text)) {
                text = text + "\n";
            }

            // 8. Update content of the file with changes
            text.to(filename.replace("README.md", "index.md"));
        }
    });

    // 9. Copy temorary directory to site's docs folder
    cp("-rf", TEMP_DIR + "*", DOCS_DIR);

    // 10. Delete temporary directory
    rm("-r", TEMP_DIR);
};

target.publishsite = function() {
    var currentDir = pwd();

    cd(SITE_DIR);
    exec("git add -A .");
    exec("git commit -m \"Autogenerated new docs and demo at " + dateformat(new Date()) + "\"");
    exec("git fetch origin && git rebase origin/master");
    exec("git push origin master");
    cd(currentDir);
};

target.changelog = function() {

    // get most recent two tags
    var tags = getVersionTags(),
        rangeTags = tags.slice(tags.length - 2),
        now = new Date(),
        timestamp = dateformat(now, "mmmm d, yyyy");

    // output header
    (rangeTags[1] + " - " + timestamp + "\n").to("CHANGELOG.tmp");

    // get log statements
    var logs = exec("git log --pretty=format:\"* %s (%an)\" " + rangeTags.join(".."), {silent: true}).output.split(/\n/g);
    logs = logs.filter(function(line) {
        return line.indexOf("Merge pull request") === -1 && line.indexOf("Merge branch") === -1;
    });

    var output = logs;
    output.shift(); // get rid of tag name
    output = output.join("\n"); //and join it into a string

    logs.push(""); // to create empty lines
    logs.unshift("");

    // output log statements
    logs.join("\n").toEnd("CHANGELOG.tmp");

    // switch-o change-o
    cat("CHANGELOG.tmp", "CHANGELOG.md").to("CHANGELOG.md.tmp");
    rm("CHANGELOG.tmp");
    rm("CHANGELOG.md");
    mv("CHANGELOG.md.tmp", "CHANGELOG.md");
    return output;
};

target.checkLicenses = function() {

    function isPermissible(dependency) {
        var licenses = dependency.licenses;

        if (Array.isArray(licenses)) {
            return licenses.some(function(license) {
                return isPermissible({
                    name: dependency.name,
                    licenses: license
                });
            });
        }

        return OPEN_SOURCE_LICENSES.some(function(license) {
            return license.test(licenses);
        });
    }

    echo("Validating licenses");

    checker.init({
        start: __dirname
    }, function(deps) {
        var impermissible = Object.keys(deps).map(function(dependency) {
            return {
                name: dependency,
                licenses: deps[dependency].licenses
            };
        }).filter(function(dependency) {
            return !isPermissible(dependency);
        });

        if (impermissible.length) {
            impermissible.forEach(function (dependency) {
                console.error("%s license for %s is impermissible.",
                    dependency.licenses,
                    dependency.name
                );
            });
            exit(1);
        }
    });
};

target.patch = function() {
    release("patch");
};

target.minor = function() {
    release("minor");
};

target.major = function() {
    release("major");
};
