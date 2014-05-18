require "execjs"

module Jekyll
  module Converters
    class Bailey < Converter
      safe true
      priority :low

      def matches(ext)
        ext =~ /\A\.bs\z/
      end

      def output_ext(ext)
        ".js"
      end

      def convert(content)
        convert_helper content, :bare => true
      end

      def convert_helper(content, options)
        context = ExecJS.compile('var bailey = require("bailey");')
        context.call("bailey.parseString", content, options)
      end
    end
  end
end
