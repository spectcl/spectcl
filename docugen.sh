#!/bin/bash
echo '---' > ../spectcl.github.io/api.md
echo >> ../spectcl.github.io/api.md
echo '---' >> ../spectcl.github.io/api.md
echo >> ../spectcl.github.io/api.md
jsdoc2md lib/*.js >> ../spectcl.github.io/api.md
