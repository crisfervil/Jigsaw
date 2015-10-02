# install steps
(This should get simpler after publishing in npm)

1 - Install node js: https://nodejs.org

2 - Install git : https://desktop.github.com/

3 - Open a comand prompt

4 - Install Type script compiler (https://github.com/Microsoft/TypeScript)
```
$ npm install tsc -g
```
5 - Definitely typed (http://definitelytyped.org)
```
$ npm install tsd -g
```
6 - Clone Green Mouse
```
$ git clone https://github.com/crisfervil/GreenMouse.git greenmouse
```
7 - Move to GreenMouse dir
```
$ cd greenmouse
```
8 - Compile greenmouse
```
$ tsc --module commonjs --target es5 -p .
```
9 - Link greenmouse (https://docs.npmjs.com/cli/link)
```
$ npm link	
```
10- Move one dir up
```
$ cd ..
```
11 - Clone Green Mouse sample app
```
$ git clone https://github.com/crisfervil/GreenMouse.git greenmouse-app
```
12 - Move to the sample app dir
```
$ cd greenmouse-app
```
13 - Link the the sample app with the Module
```
$ npm link greenmouse
```
14 - Run Green Mouse installer
```
node node_modules/greenmouse/run install
```