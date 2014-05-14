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

      def compile_examples()
        space = '                    '
        puts "#{space}Compiling examples"
        IO.popen('bailey ../examples/ ../examples/js/ --bare') { |io| io.each{|s| puts s} }
        success = $? == 0
        puts "#{space}Compilation failed" unless success
        success
      end

      def render(context)
        file = context
        @file.split('.').each{ |item| file = file[item] if file}
        if @language == 'javascript'
          file = "../examples/js/#{file.downcase}.js"
        else
          file = "../examples/#{file.downcase}.bs"
        end

        if compile_examples()
          file_path = File.join *file.split('/')

          if File.exists? file_path
            content = File.read file_path
            highlighted = highlight content, context
          end
        end

        highlighted or 'Could not load example.'
      end

      def highlight(content, context)
        @language = 'coffeescript' if @language == 'bailey'
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

Liquid::Template.register_tag('load_example', Jekyll::Tags::LoadExampleBlock)
