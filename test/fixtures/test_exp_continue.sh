#!/bin/bash

echo "\"Connecting\" to a server:"
echo -n "user:"
read USER
echo -n "password:"
read -s PASSWORD
printf "\n[$USER@test-server]$ "
read COMMAND
echo "output"
echo "exiting..."
exit 0
