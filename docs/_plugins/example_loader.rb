require "execjs"

module Jekyll
  module Tags
    class LoadExampleBlock < Liquid::Tag

      def initialize(tag_name, text, token)
        super

        if parts = text.match(/([a-zA-Z]+) ([a-z]+)/)
          @file = parts[1]
          @language = parts[2]
        else
          raise SyntaxError, "Unrecognized argument '#{text}'."
        end
      end

      def convert_helper(content)
        IO.popen(["node", "../bailey", "--bare", "--stdio"], "w+") do |io|
          io.write content
          io.close_write
          io.readlines.join.chomp
        end
      end

      def render(context)
        file = context
        @file.split('.').each{ |item| file = file[item] if file}
        file = "../examples/#{file.downcase}.bs"

        file_path = File.join *file.split('/')

        if File.exists? file_path
          content = File.read file_path
          content = convert_helper(content) if @language == 'javascript'
          highlighted = highlight content, context
        end

        highlighted or 'Could not load example.'
      end

      def highlight(content, context)
        language = @language
        language = 'coffeescript' if @language == 'bailey'
        highlight_block = Jekyll::Tags::HighlightBlock.new(
          'highlight',
          language,
          [content, "{% endhighlight %}" ]
        )

        highlight_block.render context
      end
    end
  end
end

Liquid::Template.register_tag('load_example', Jekyll::Tags::LoadExampleBlock)
