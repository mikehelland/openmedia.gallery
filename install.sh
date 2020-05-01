
echo IMPORTANT! This requires Postgresql 9.4 or later!
echo This will install Postgresql if there isn't a version installed
echo But you should check to see if it's 9.4 or later


read -p "Enter a DATABASE NAME [omg_db]: " name
name=${name:-omg_db}
export OMG_DB_NAME=$name

echo "Give a db password"
read -s password
export OMG_DB_PW=$password

which psql
if [ "$?" -gt "0" ]; then
  sudo apt install postgresql postgresql-contrib
else
  echo "Postgresql is installed. Hopefully 9.4 or later!"
fi

echo creating database...

./create_database.sh

echo create node modules for the project

npm install

echo run with node main.js