#!/bin/bash

export MONGO_DB_USERNAME = 0
export MONGO_DB_PASSWORD = 0
export MONGO_DB_CLUSTER_NUMBER = 0
export MONGO_DB_DATABASE_NAME = 0

echo "STARTING THE SERVER FROM THE LINUX OS"

if [ $MONGO_DB_USERNAME -ne 0 ]; then
    if [ $MONGO_DB_PASSWORD -ne 0 ]; then
        if [ $MONGO_DB_CLUSTER_NUMBER -ne 0 ]; then
            if [ $MONGO_DB_DATABASE_NAME -ne 0 ]; then
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
node .\index.js