bailey.js
=========
bailey.js is a pragmatic language that compiles to javascript. Sort of like coffeescript, but a lot more inspired by python than ruby, with a focus on creating a cleaner, saner language with less flaws.

bailey.js is currently very, very work in progress, with lots of stuff missing. But if you want to check it out, see the language in `examples/example.bs`, and convert it to js with the following command:

```
node bailey.js examples/ build/
```

### Options
#### --node
This will result in a version with node imports instead of requirejs-imports

#### --remove-comments
This will remove all comments in the compiled version.
