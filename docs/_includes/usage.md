## Usage

### In the command line
{% highlight bash %}
  bailey sourceDir/ targetDir/
{% endhighlight %}
Converts all `.bs` files in sourceDir to a `.js` file in targetDir.

### In Javascript
There are two possible ways to utilize bailey in Javascript. The first is to
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
