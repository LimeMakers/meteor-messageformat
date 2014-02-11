#!/bin/bash
PACKAGE_NAME=messageformat
PACKAGE_PATH=laika/packages/$PACKAGE_NAME

#move and setup packages
rm -rf $PACKAGE_PATH/lib
rm -rf $PACKAGE_PATH/package.js
mkdir -p $PACKAGE_PATH

cp -rf ./lib $PACKAGE_PATH
cp -rf ./package.js $PACKAGE_PATH

cd laika
laika -V -t 5000 $@
