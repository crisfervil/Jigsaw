install instructions:


install node
npm install tsc -g
npm install tsd -g
npm install git -g

git clone https://github.com/crisfervil/GreenMouse.git greenmouse
cd greenmouse
npm install
tsd install
tsc --module commonjs --target es5 -p .
npm link	
cd ..

git clone https://github.com/crisfervil/GreenMouse.git greenmouse-app
cd greenmouse-app
npm link greenmouse
node node_modules/greenmouse/run install