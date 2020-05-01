
sudo -u postgres psql postgres -c "CREATE DATABASE '$OMG_DB_NAME'"
sudo -u postgres psql omusic_db -c "CREATE USER '$OMG_DB_NAME' WITH PASSWORD '$OMG_DB_PW'"
sudo -u postgres psql omusic_db -c "CREATE TABLE users (id bigserial primary key, created_at timestamp not null default current_timestamp, last_login timestamp, username char(20) not null, bpassword char(60) not null, btc_address char(35), admin boolean, sources jsonb, uploaded_bytes bigint default 0, upload_limit bigint default 0)"
sudo -u postgres psql omusic_db -c "ALTER TABLE users OWNER TO '$OMG_DB_NAME'"

