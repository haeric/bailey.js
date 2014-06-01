require('mocha');
var should = require('should'),
    bailey = require('../bailey.js'),
    fs = require('fs'),
    rmdir = require('rimraf'),
    hint = require('./hint').hint;

describe('bailey.js', function () {
  describe('parseString', function () {
    it('should parse bare', function (done) {
      bailey.parseString('console.log("wee")', {bare: true}).should.equal('console.log("wee");');
      done();
    });

    it('should parse without comments', function (done) {
      bailey.parseString('# Chocolate', {removeComments: true}).should.not.containEql('//');
      done();
    });

    it('should parse with node imports', function (done) {
      bailey.parseString('import color\nconsole.log("wee")', {node: true}).should.containEql('require("color")');
      done();
    });

    it('should parse with normal imports', function (done) {
      bailey.parseString('import color\nconsole.log("wee")', {}).should.containEql('define(["color"]');
      done();
    });
  });

  describe('parseFiles', function () {
    function clean() { rmdir.sync('test/build', function(error){}); }
    function errorCallback(err) { throw err; }
    function evalFile(file) {
      file = 'test/build/' + file.replace('.bs', '.js');
      var data = fs.readFileSync(file);
      data.toString().should.be.ok;
      result = eval(data.toString());
      should(result).equal(42);
      should(hint(data.toString(), {
          name: file,
          hintOptions: { expr: true } // the "output;" on the last line that outputs 42 triggers this warning
      })).be.empty;
    }
    function testHelper (options, done){
      options = options;
      bailey.parseFiles('test/fixtures/', 'test/build/', options, null, errorCallback, function () {

        fs.readdir('test/fixtures/', function (err, files) {
          if (err) throw err;
          files.forEach(evalFile);
          done();
        });
      });
    }

    beforeEach(clean);

    it('should parse examples with bare option', function (done){
      testHelper({bare: true}, done);
    });

    it('should parse examples with remove comments option', function (done){
      testHelper({bare: true, removeComments: true}, done);
    });

    it('should parse examples with node option', function (done){
      testHelper({bare: true, node: true}, done);
    });
  });
});
