persist_list=(
    "http.ts"
    "dos/dosbox/ts/worker.ts"
    "impl/modules.ts"
    )
version=v0.73.7

# mkdir -p .emulators
# curl -fsSL https://github.com/js-dos/emulators/archive/refs/tags/$version.zip \
#     -x 192.168.1.6:7890\
#     -o .emulators/$version.zip
# 7z x .emulators/$version.zip -o.emulators/

folder=.emulators/emulators-${version:1:10}/src/
cd $folder
for file in `find . -name "*.ts"`
do
    contain=no
    for persist in ${persist_list[@]}
    do
        if [ "$file" == "./$persist" ]
        then contain=yes
        fi
    done
    if [ "$contain" == "yes" ]
        then dst=../../../src/emulators/${file/.ts}.origin.ts
        else dst=../../../src/emulators/$file
    fi
    echo copy from $file to $dst
    cp $file $dst
done
cd -