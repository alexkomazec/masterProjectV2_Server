@echo off

set MONGO_DB_USERNAME = 0
set MONGO_DB_PASSWORD = 0
set MONGO_DB_CLUSTER_NUMBER = 0
set MONGO_DB_DATABASE_NAME = 0

echo "STARTING THE SERVER FROM THE WINDOWS OS"

if %MONGO_DB_USERNAME% == 0 (
    echo "Please Set MONGO_DB_USERNAME environment variable"
    goto label_exit
)

if %MONGO_DB_PASSWORD% == 0 (
    echo "Please Set MONGO_DB_PASSWORD environment variable"
    goto label_exit
)

if %MONGO_DB_CLUSTER_NUMBER% == 0 (
    echo "Please Set MONGO_DB_CLUSTER_NUMBER environment variable"
    goto label_exit
)


if %MONGO_DB_DATABASE_NAME% == 0 (
    echo "Please Set MONGO_DB_DATABASE_NAME environment variable"
    goto label_exit
)

echo "All environment variables have been set"
echo "Starting the server!"
node .\index.js

:label_exit
exit