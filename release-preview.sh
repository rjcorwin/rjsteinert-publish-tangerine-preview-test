if [ ! $1 ]; then
 echo "You must define the version."
 exit
fi
VERSION=$1
echo "Building for $VERSION"
cd tangerine-preview
npm install
git clone https://github.com/rjsteinert/rjsteinert-publish-tangerine-preview-test tmp
cd tmp 
git checkout $VERSION
cd client
npm install
npm run build
rm -fr ../../app
mv dist/tangerine-client ../../app
cd ../../
rm -rf tmp
npm version $VERSION
npm publish
cd ../
