# Project description
Green Mouse is an extensible DSL framework to build any type of applications

# Install steps
(This should get simpler after publishing in npm)

Avoid 1 to 5 if you already have those tools installed

1 - Install node js: https://nodejs.org

2 - Install git : https://desktop.github.com/

3 - Open a comand prompt

4 - Install Type script compiler (https://github.com/Microsoft/TypeScript)
```
$ npm install tsc -g
```
5 - Install Definitely typed (http://definitelytyped.org)
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
8 - Install definitely typed typings
```
$ tsd install
```
9 - Compile Green Mouse
```
$ tsc -p .
```
10 - Link greenmouse (https://docs.npmjs.com/cli/link)
```
$ npm link	
```
11- Move one dir up
```
$ cd ..
```
12 - Clone Green Mouse sample app
```
$ git clone https://github.com/crisfervil/GreenMouse.git greenmouse-app
```
13 - Move to the sample app dir
```
$ cd greenmouse-app
```
14 - Link the the sample app with the module
```
$ npm link greenmouse
```
15 - Run Green Mouse installer
```
$ node node_modules/greenmouse/run install
```