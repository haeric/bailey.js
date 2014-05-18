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
        IO.popen(["node", "../bailey", "--bare", "--stdio"], "w+") do |io|
          io.write content
          io.close_write
          io.readlines.join.chomp
        end
      end
    end
  end
end
