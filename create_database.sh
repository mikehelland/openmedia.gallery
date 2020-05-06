read -p "Enter a DATABASE NAME [omg_db]: " name
name=${name:-omg_db}
export OMG_DB_NAME=$name

echo "Give a db password"
read -s password
export OMG_DB_PW=$password

which psql
if [ "$?" -gt "0" ]; then
  echo "Installing postgresql"
  sudo apt install postgresql postgresql-contrib
else
  echo "Postgresql is installed. Hopefully 9.4 or later!"
fi

echo creating database...

sudo -u postgres psql postgres -c "CREATE DATABASE $OMG_DB_NAME"
sudo -u postgres psql $OMG_DB_NAME -c "CREATE USER $OMG_DB_NAME WITH PASSWORD '$OMG_DB_PW'"
sudo -u postgres psql $OMG_DB_NAME -c "CREATE TABLE users (id bigserial primary key, created_at timestamp not null default current_timestamp, last_login timestamp, username char(20) not null, bpassword char(60) not null, btc_address char(35), admin boolean, sources jsonb, uploaded_bytes bigint default 0, upload_limit bigint default 0)"
sudo -u postgres psql $OMG_DB_NAME -c "ALTER TABLE users OWNER TO $OMG_DB_NAME"

echo "export OMG_DB_NAME=$OMG_DB_NAME" > runomg.sh
echo "export OMG_DB_PW=$OMG_DB_PW" >> runomg.sh
echo "export OMG_PORT=8080" >> runomg.sh
echo "forever start -o out.log -e err.log main.js" >> runomg.sh
chmod +x runomg.sh