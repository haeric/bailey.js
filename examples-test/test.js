var fs = require("fs");

var do_something = function(with_this) {
    console.log(with_this)
};

do_something("lala")
module.exports = {
    'fs': fs,
    'do_something': do_something
};