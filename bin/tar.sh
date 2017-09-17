#!/bin/bash
# tar the contents of hexagram and scp to dev
# or untar the contents of a tar ball

ACTION=$1       # The tar action to take, one of: / maketar / xtar /
HEXMAP=$2
TARGET=$3       # Tar target, defaults to 'most', one of: / most / all / docs /

if [ -z ${TARGET} ]; then
    TARGET=most
fi

if [ $TARGET == 'most' ] || [ $TARGET == 'all' ]; then
    echo everything except docs
    TARRED=www.tar
    TAR_FILES=" \
        bin \
        calc \
        config/config* \
        config/settingsA* \
        config/settingsB* \
        http \
        https \
        www/client \
        www/imports \
        www/lib \
        www/public/*svg \
        www/public/*ico \
        www/public/*png \
        www/public/icons \
        www/public/images \
        www/public/*js \
        www/public/*gif \
        www/server/*js \
        www/server/*py \
        www/package.json \
        "
elif [ $TARGET == 'docs' ]; then
    echo the docs in www/public
    TARRED=docs.tar
    TAR_FILES=" \
        www/public/help \
        www/public/query \
        "
fi
if [ $TARGET == 'all' ]; then
    echo adding the docs in www/public
    TAR_FILES+=" \
        www/public/help \
        www/public/query \
        "
fi

if [ $ACTION == 'maketar' ]
    then
    echo 'tarring to' $TARRED
    rm $TARRED
    tar -cf $TARRED $TAR_FILES
    ls -l $TARRED
    scp $TARRED kolossus.sdsc.edu:dev

elif [ $ACTION == 'xtar' ]; then
    echo 'cleaning directories'
    rm -rf $TAR_FILES
    echo 'untarring'
    tar -xf /cluster/home/swat/dev/$TARRED
    echo 'xtar done'

else
    echo Invalid tar action: $ACTION
    echo Exiting
fi