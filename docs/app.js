var app = new Vue({
  el: '#app',
  data: {
    text: '',
    alert: '',
    showAlert: false,
    placeholder: `// Paste code here !

struct Book {
    let price: Int
    let title: String
}`,
    demo1: `struct Book {
    let price: Int
    let title: String
}`,
    demo2: `public final class MyClass: MyProtocol {
    // comment
    @objc private let boolValue: Bool // comment
    private var intValue: Int
    internal var optionalValue: Int?
    open let stringValue: String
    public let url: URL
    open let dateValue: Date
    fileprivate let customType: CustomType
    var computedPropety: Int {
      return 0
    }
    let collection: [String]
    let collectionWithNameSpace: [Hoge.Fuga]
    var defaultVar: Int = 1
    let defaultLet: Int = 1 
    var noTypeAnotation = 1
    var noTypeAnotationString = "hoge"
}`
  },
  mounted: function () {
    prettyPrint();
    console.log("mounted code syntax highlight")
    this.$nextTick(function () {
      // レンダリングする度に実行
      prettyPrint();
      console.log("mounted code syntax highlight")
    })
  },
  computed: {
    typeName() {
      output = this.text
        .split("\n")
        .filter(line => line.includes('class') || line.includes('struct'))
        .join("")
        .replace(/.*(class|struct) ([a-z|A-Z|0-9]+).*/g, '$2')
      return output.length == 0 ? "<#FixMe#>" : output
    }
  },
  methods: {
    demo1OnClick: function (event) {
      this.text = this.demo1
    },
    demo2OnClick: function (event) {
      this.text = this.demo2
    },
    clearOnClick: function (event) {
      this.text = ''
    }
  },
  filters: {
    remove: function (text) {
      return text
        .split("\n")
        .filter(line => !line.includes('class') || !line.includes('struct')) // remove type definition
        .filter(line => !line.includes('{')) // remove computed property
        .filter(line => !(line.includes('let') && line.includes('='))) // remove let with default value
        .filter(line => line.includes('var') || line.includes('let')) // remove lines without let or var
        .map(line => line.replace(/\/\/.*/g, '')) // remove comment
        .map(line => line.replace(/@[a-z|A-Z|0-9]* /g, '')) // remove attribute
        .map(line => line.replace(/(open|public|internal|fileprivate|private) /g,
          '')) // remove access control
        .map(line => line.replace(/(let|var) /g, '')) // remove let var
        .map(line => line.trim())
        .join("\n")
    },
    factoryMethod: function (text, typeName) {
      if (text.length == 0) {
        return "\n"
      }
      lines = text.split("\n")
      parameters = lines
        .map(line => line
          .replace(/:(| )Bool$/g, ': Bool = false') // Bool
          .replace(/:(| )(Int|Float|Double)$/g, ': $2 = 0') // Int
          .replace(/:(| )String$/g, ': String = ""') // String
          .replace(/:(| )URL$/g, ': URL = URL(string: "https://sample.com")!') // URL
          .replace(/\[([a-z|A-Z|0-9|\.]*)\]$/g, '[$1] = []') // Collection
          .replace(/(: .*\?).*/g, '$1 = nil') // Optional
          .replace(/: ([a-z|A-Z|0-9|\.]*$)/g, ': $1 = .make()') // custom type
          .replace(/^([a-z|A-Z|0-9|\.]*) = "/g, '$1: String = "') // no type anotation string
          .replace(/^([a-z|A-Z|0-9|\.]*) =/g, '$1: <#FixMe#> =') // no type anotation
          .trim()
        )
        .join(',\n        ')
      body = lines
        .map(line => line
          .replace(/:.*/g, '')
          .replace(/ =.*/g, '')
        )
        .map(line => line + ": " + line)
        .join(",\n            ")
      return `extension ${typeName} {
    static func make(
        ${parameters}
    ) -> ${typeName} {
        return ${typeName}(
            ${body}
        )
    }
}`
    },
    memberwiseInitializer: function (text, typeName) {
      if (text.length == 0) {
        return "\n"
      }
      lines = text.split("\n")
      parameters = lines
        .map(line => line
          .replace(/^([a-z|A-Z|0-9|\.]*) = ".*/g, '$1: String') // no type anotation string
          .replace(/ =.*/g, '') // remove default value
          .replace(/^([a-z|A-Z|0-9|\.]*$)/g, '$1: <#FixMe#>') // no type anotation
          .trim()
        )
        .join(',\n        ')
      body = lines
        .map(line => line
          .replace(/:.*/g, '')
          .replace(/ =.*/g, '')
        )
        .map(line => "self." + line + " = " + line)
        .join("\n        ")
      return `extension ${typeName} {
    init(
        ${parameters}
    ) {
        ${body}
    }
}`
    },
    equatable: function (text, typeName) {
      if (text.length == 0) {
        return "\n"
      }
      lines = text.split("\n")
      parameters = lines
        .map(line => line
          .replace(/ =.*/g, '') // remove default value
          .replace(/^([a-z|A-Z|0-9|\.]*$)/g, '$1: <#FixMe#>') // no type anotation
          .trim()
        )
        .join(',\n        ')
      body = lines
        .map(line => line
          .replace(/:.*/g, '')
          .replace(/ =.*/g, '')
        )
        .map(line => "lhs." + line + " == " + "rhs." + line)
        .join(" &&\n            ")
      return `extension ${typeName}: Equatable {
    static func == (lhs: ${typeName}, rhs: ${typeName}) -> Bool {
        return 
            ${body}
    }
}`
    },
    matchable: function (text, typeName) {
      if (text.length == 0) {
        return "\n"
      }
      lines = text.split("\n")
      parameters = lines
        .map(line => line
          .replace(/ =.*/g, '') // remove default value
          .replace(/^([a-z|A-Z|0-9|\.]*$)/g, '$1: <#FixMe#>') // no type anotation
          .trim()
        )
        .join(',\n        ')
      body = lines
        .map(line => line
          .replace(/:.*/g, '')
          .replace(/ =.*/g, '')
        )
        .map(line => "lhs." + line + " == " + "rhs." + line)
        .join(" &&\n            ")
      return `extension ${typeName}: Matchable {
    public var matcher: ParameterMatcher<${typeName}> {
        return equal(to: self)
    }
}`
    }
  }
});