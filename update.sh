if [ -f NOUPDATE ]; then
    echo "NOUPDATE"
    exit 1
fi

git pull

for dir in apps/*/    
do
    echo $dir
    cd $dir
   
    if [ -d .git ]; then
        echo "has git"
        git pull
    fi
   
    cd ..
    cd ..
done