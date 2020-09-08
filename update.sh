if [ -f NOUPDATE ]; then
    echo "NOUPDATE"
    exit 1
fi

git pull

for dir in apps/*/    
do
    cd $dir
   
    if [ -d .git ]; then
        echo "----"
        echo $dir
        git pull
    fi
   
    cd ..
    cd ..
done