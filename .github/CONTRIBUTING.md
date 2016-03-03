# Contributing to Spectcl
Thanks for contributing to Spectcl!

The following is a set of guidelines to follow when contributing to Spectcl or any packages hosted
in the Spectcl Organization.  Feel free to propose changes to this document in a pull request.

## Reporting Bugs

Bugs are tracked as GitHub issues [here](https://github.com/spectcl/spectcl/issues).

Please explain the problem with the following details when possible:
- **Start by making sure there isn't already an open issue** for the behavior you're seeing.
- **Use a clear, descriptive title** when creating your issue.
- **Describe the bad behavor** as well as you can, so we can better understand what's going on.
- **Describe how to reproduce the problem** with as much detail as you can.  This will help us to debug
quicker.
- If the issue resulted in a crash, **please provide a stack-trace** in a block quote.
- **Describe the expected behavior** you would have expected to see.

Think you can resolve the issue? Great! We encourage you to submit a Pull Request with the fix.

## Pull Requests

### Getting Started

1. **Fork and clone** your own package repository.  GitHub provides helpful documentation on how to do so
[here](https://help.github.com/articles/fork-a-repo).  Be sure to **add the upstream source**:
```bash
git remote add upstream git@github.com:spectcl/spectcl.git
```
1. Make sure that there is an issue that covers the work that you're doing.  If there isn't an issue,
you can create one.  If there is a pre-existing issue, indicate that you're working on it so as
to avoid duplication of effort.

### Making Code Edits

The process of submitting a Pull Request is relatively simple, following a 
[rebase workflow](http://kensheedlo.com/essays/why-you-should-use-a-rebase-workflow/).  Please use the
following pattern:

1. Create a new branch for your fix/feature
1. Make your changes
1. Run the test suite *(if failed, goto 2)*
1. Squash your commits *(re-run test suite)*
1. Rebase onto the upstream *(re-run test suite)*
1. Submit the Pull Request

#### Create the Branch
Your first step will be to create a feature branch in your fork with a descriptive name for the work
that will occur in the branch:
```bash
git checkout -b issue-123
```

In general, any branch should be single-purpose.  Do not combine fixes in a single branch.

#### Make your changes
Make your changes to the code and tests.  Follow our code conventions, as documented in our `.eslintrc`
file.  Please keep your commits [atomic](http://seesparkbox.com/foundry/atomic_commits_with_git).

Please observe these easy-to-follow rules when authoring your commit:

1. Separate the subject line from the body with a blank line
1. Limit the subject line to 50 characters
1. Capitalize the subject line
1. Do not end the subject line with a period
1. Use the imperative (**present-tense**) mood in the subject line
1. Wrap the body at 72 characters
1. Use the body to explain the **what** and **why** of your change, not the **how**
1. Use the footer of your commit message to reference/[resolve](https://help.github.com/articles/closing-issues-via-commit-messages/) any relevant issues

These rules help to maintain a readable commit history, and avoid a situation like this:

![xkcd](http://imgs.xkcd.com/comics/git_commit.png)

Here is an example of a good commit message.
```
Derezz the master control program

MCP turned out to be evil and had become intent on world domination.
This commit throw's Trons disc into the MCP (causing its deresolution)
and turns the program back into a chess game.

Resolves #1337
```

#### Rebase onto the upstream
Before submitting your Pull Request, rebase onto the `upstream` master branch.  This ensures that
your changes are working with the latest merged code.
```bash
git fetch upstream
git rebase upstream/master
```

If you haven't already, you should add the upstream branch as a remote source:
```bash
git remote add upstream git@github.com:spectcl/spectcl.git
```

#### Run the test suite
Be sure to run all of the tests before submitting your Pull Request to ensure that everything works:
```bash
npm test
```

##### Warning
the `npm test` command uses a code coverage tool which modifies the source to instrument it. Please run `npm run mocha` to run the tests if you are encountering a failure, as this will generate a proper stack trace.


We also provide an `npm` script to check that your changes conform to our style guidelines:
```bash
npm run lint
```

#### Squash your commits
Please squash your commits when appropriate.  We'd prefer to have one commit fix/implement one feature.

#### Send the Pull Request
GitHub provides documentation on submitting a Pull Request
[here](https://help.github.com/articles/creating-a-pull-request).

#### Watch your PR
Watch for CI status and any comments from reviewers. [Travis-ci](https://travis-ci.org/spectcl/spectcl) will run the tests and will report the status in your pull request. We [cannot merge](https://help.github.com/articles/about-protected-branches/) pull requests unless the tests pass. This goes for our own PRs as well. If the tests fail or you receive comments regarding your code, please follow the rebase workflow as outlined above.

That's it! Thanks so much for contributing to Spectcl.

