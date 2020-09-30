# this is run by admin.js
# if you want to run it, run it from the parent directory

if [ -f NOUPDATE ]; then
    echo "NOUPDATE"
    exit 1
fi

echo "Updating Server"
echo
git pull

for dir in apps/*/    
do
    cd $dir
   
    if [ -d .git ]; then
        echo
        echo "==================================="
        echo
        echo "Updating App: $dir"
        echo
        git pull
    fi
   
    cd ..
    cd ..
done