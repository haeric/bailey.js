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

### Configurationfile `.baileyrc`
Bailey.js has support for configuration through a json file called `.baileyrc`.
It can be used in order to shorten the parse command or to define several
configurations for a project. This can often be the use case in an web project
with a node or io.js backend. The configuration file can define multiple sets
of options like the example below. Any options passed in the cli will override
the configuration file and if positional arguments are passed in the cli bailey
will not read the configuration file.

{% highlight json %}
{
  "server": {
    "source": "src/server",
    "target": "dist/server",
    "node": true
  },
  "frontend": {
    "source": "src/frontend",
    "target": "dist/server/public"
  }
}
{% endhighlight %}

The example above will compile the server code as node and the frontend code
as require.js when you run `bailey`. It is also possible to run `bailey -c frontend`
or `bailey --config frontend` in order to compile only the frontend code.
