#!/bin/bash

export MONGO_DB_USERNAME=""
export MONGO_DB_PASSWORD=""
export MONGO_DB_CLUSTER_NUMBER="cluster0.xey9d.mongodb.net"
export MONGO_DB_DATABASE_NAME="PlayerDB"

echo "STARTING THE SERVER FROM THE LINUX OS"

if [ [$MONGO_DB_USERNAME != '0'] ];then
    if [ $MONGO_DB_PASSWORD != '0' ];then
        if [ $MONGO_DB_CLUSTER_NUMBER != '0' ];then
            if [ $MONGO_DB_DATABASE_NAME != '0' ];then
                echo "All environment variables have been set"
            else
                echo "MONGO_DB_DATABASE_NAME is not set"
                exit
            fi
        else
            echo "MONGO_DB_CLUSTER_NUMBER is not set"
            exit
        fi
    else
        echo "MONGO_DB_PASSWORD is not set"
        exit
    fi
else
    echo "MONGO_DB_USERNAME is not set"
    exit
fi

echo "Starting the server!"
node index.js