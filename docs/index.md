---
layout: base
title: bailey.js
---

## Installation
Installing bailey.js requires you to have [node.js](http://nodejs.org/)
and [node packet manager](https://www.npmjs.org/) installed. If you have
those installed it is as simple as running:

{% highlight bash %}
  $ npm install bailey
{% endhighlight %}

## Usage

### In the command line
{% highlight bash %}
  node bailey.js sourceDir/ targetDir/
{% endhighlight %}

### In javacscript
There are two possible ways to utilise bailey in javascript. The first is to
compile a string using `parseString` or compile the content of a folder like
the command line example by using `parseFiles`.

{% highlight javascript %}
  var bailey = require('bailey');

  var compiledString = bailey.parseString(sourceString, {});

  // This is the equivalent of the command line example
  bailey.parseFiles('sourceDir/', 'targetDir/', {}});
{% endhighlight %}


### Options
The options listed below can be used in different settings. Prepended with `--`
is used with the command line and the ones in the parentheses are used in the
option parameter when running bailey from javascript.

#### `--node` (`node`)
This will result in a version with node imports instead of requirejs-imports

#### `--remove-comments` (`removeComments`)
This will remove all comments in the compiled version.

#### `--bare` (`bare`)
This will make the Javascript file without the wrapper function.


{% include examples.html %}
