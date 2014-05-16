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

      def convert_helper(content, options)
        context = ExecJS.compile('var bailey = require("bailey");')
        context.call("bailey.parseString", content, options)
      end

      def render(context)
        file = context
        @file.split('.').each{ |item| file = file[item] if file}
        file = "../examples/#{file.downcase}.bs"

        file_path = File.join *file.split('/')

        if File.exists? file_path
          content = File.read file_path
          content = convert_helper(content, { :bare => true }) if @language == 'javascript'
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
