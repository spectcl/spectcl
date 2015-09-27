#!/usr/bin/env tclsh

# echo.tcl: Simple example for using `echo` command with Expect.
#
# (C) 2015, Ryan Milbourne, ViaSat Inc.

package require Expect
log_user 0

spawn ls "-la" "/tmp/undefined"
expect {
    "No such file or directory" {
        puts "That file/dir doesn't exist!"
    }
}
