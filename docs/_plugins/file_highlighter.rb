module Jekyll
  module Tags
    class HighlightFileBlock < Liquid::Tag

      def initialize(tag_name, text, token)
        super

        if parts = text.match(/\A\s*([^"\s]+|"(?:[^\\"]*|\\.)*") \s+([^"\s]+|"(?:[^\\"]*|\\.)*") \s*\Z/x)
          @language = parts[1]
          @file = parts[2]
        else
          raise SyntaxError, "Unrecognized argument '#{text}'."
        end
      end

      def render(context)
        file = context
        @file.split('.').each{ |item| file = file[item] if file}
        file_path = File.join *file.split('/')

        content = File.read file_path
        highlighted = highlight content, context

        highlighted
      end

      def highlight(content, context)
        highlight_block = Jekyll::Tags::HighlightBlock.new(
          'highlight',
          @language,
          [content, "{% endhighlight %}" ]
        )

        highlight_block.render context
      end
    end
  end
end

Liquid::Template.register_tag('highlight_file', Jekyll::Tags::HighlightFileBlock)
