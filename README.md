bailey.js
=========
  
[bailey.js](http://haeric.github.io/bailey.js) is a pragmatic language that parses to javascript. Sort of like coffeescript, but a lot more inspired by python than ruby, with a focus on creating a cleaner, saner language with less flaws.

bailey.js is currently very, very work in progress, and backwards-incompatible changes can occur without much warning.

[![Build status](https://ci.frigg.io/badges/haeric/bailey.js/)](https://ci.frigg.io/haeric/bailey.js/)

### Installation
```
npm install bailey -g
```

### Usage
Compile .bs files in a directory to .js files like so:
```
bailey examples/ build/
```

### Documentation
[haeric.github.io/bailey.js](http://haeric.github.io/bailey.js)

#### Helpful make commands
```
$ make help
    browser - make browser version
    parser  - create the peg parser if it does not exist
    clean   - delete the peg parser
    test    - run this often
```


### Contribute
Pull requests are welcome! The following commit conventions have been established, with more to come...
* :boom: for backwards incompatible changes. Uh-oh.
* :notebook: for doc changes
