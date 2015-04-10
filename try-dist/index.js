var $ = require("jquery");
var bailey = require("../../src/compiler");


$(document).ready(function() {
    var preview = $('#preview');
    $('textarea[name=bs]').keyup(function(event) {
        try {
            var bs = $(this).val();
            preview.find('#default-preview').html(bailey.parse(bs));
            preview.find('#node-preview').html(bailey.parse(bs, {
                'node': true
            }));
            preview.find('#bare-preview').html(bailey.parse(bs, {
                'bare': true
            }));
            preview.find('.errors').html('').addClass('hidden');
            preview.find('.outputs').removeClass('hidden');
        } catch (e) {
            preview.find('.outputs').addClass('hidden');
            preview.find('.errors').html('<pre>' + e.message + '</pre>').removeClass('hidden');
        }
    });
});


module.exports = {
    '$': $,
    'bailey': bailey
};