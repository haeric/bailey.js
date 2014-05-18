---
layout: landing
title: bailey.js
---

## Installation
Installing bailey.js requires you to have [node.js](http://nodejs.org/) installed. If you have those installed it is as simple as running the command below to install bailey.js globally.

{% highlight bash %}
  $ npm install bailey -g
{% endhighlight %}

If you want to add it to your project dependencies run `npm install bailey --save`.

## Usage

### In the command line
{% highlight bash %}
  bailey sourceDir/ targetDir/
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
Use node imports instead of requirejs-imports, for running things server-side.

#### `--remove-comments` (`removeComments`)
Remove all comments in the compiled version.

#### `--bare` (`bare`)
Make the Javascript file without the wrapper function.

#### `--watch`
Watch the source file or directory, recompiling when any file changes.

#### `--version`
Output the current version.

{% include examples.html %}

## Feedback?
Feedback is awesome! Did you find a bug, do you have a question or do you have a great idea for a feature? Just [open an issue on Github](https://github.com/haeric/bailey.js/issues/new) or join our discussion on [gitter.im/haeric/bailey.js](https://gitter.im/haeric/bailey.js)
