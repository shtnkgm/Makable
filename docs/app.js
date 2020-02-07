var app = new Vue({
  el: '#app',
  data: {
    text: ``,
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
    let dictionary: [String: Int]
    var defaultVar: Int = 1
    let defaultLet: Int = 1 
    var noTypeAnotation = 1
    var noTypeAnotationString = "hoge"
}`
  },
  // mounted: function () {
  //   this.$nextTick(function () {
  //     hljs.initHighlighting()
  //   })
  // },
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
          .replace(/:(| )((U|)Int(|8|16|32|64)|Float|Double)$/g, ': $2 = 0') // Int
          .replace(/:(| )String$/g, ': String = ""') // String
          .replace(/:(| )URL$/g, ': URL = URL(string: "https://sample.com")!') // URL
          .replace(/\[([a-zA-Z0-9\.]*): ([a-zA-Z0-9\.]*)\]$/g, '[$1: $2] = [:]') // Dictionary
          .replace(/\[([a-zA-Z0-9\.]*)\]$/g, '[$1] = []') // Collection
          .replace(/(: .*\?).*/g, '$1 = nil') // Optional
          .replace(/: ([a-zA-Z0-9\.]*$)/g, ': $1 = .make()') // custom type
          .replace(/^([a-zA-Z0-9\.]*) = "/g, '$1: String = "') // no type anotation string
          .replace(/^([a-zA-Z0-9\.]*) =/g, '$1: <#FixMe#> =') // no type anotation
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
          .replace(/^([a-zA-Z0-9\.]*) = ".*/g, '$1: String') // no type anotation string
          .replace(/ =.*/g, '') // remove default value
          .replace(/^([a-zA-Z0-9\.]*$)/g, '$1: <#FixMe#>') // no type anotation
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
    decodableInitializer: function (text, typeName) {
      if (text.length == 0) {
        return "\n"
      }
      lines = text.split("\n")
      body = lines
        .map(line => line
          .replace(/^([a-zA-Z0-9\.]*) = ".*/g, '$1: String')
          .replace(/ =.*/g, '') // remove default value
          .replace(/^([a-zA-Z0-9\.]*$)/g, '$1: <#FixMe#>') // no type anotation
          .replace(/^([a-zA-Z0-9\.]*): \[([a-zA-Z0-9\.]*).*: ([a-zA-Z0-9\.]*).*\]$/g, '$1 = try values.decode(<#FixMe#>.self, forKey: .$1)') // Dictionary
          .replace(/^([a-zA-Z0-9\.]*): \[([a-zA-Z0-9\.]*).*\]$/g, '$1 = try values.decode([$2].self, forKey: .$1)') // Collection
          .replace(/^([a-zA-Z0-9\.]*): ([a-zA-Z0-9\.]*).*$/g, '$1 = try values.decode($2.self, forKey: .$1)')
        )
        .join("\n        ")
      return `extension ${typeName}: Decodable {
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ${body}
    }
}`
    },
    encodableImplementation: function (text, typeName) {
      if (text.length == 0) {
        return "\n"
      }
      lines = text.split("\n")
      body = lines
        .map(line => line
          .replace(/ =.*/g, '') // remove default value
          .replace(/:.*/g, '') // remove type
          .replace(/^([a-zA-Z0-9\.]*)$/g, 'try container.encode($1, forKey: .$1)')
        )
        .join("\n        ")
      return `extension ${typeName}: Encodable {
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
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
          .replace(/^([a-zA-Z0-9\.]*$)/g, '$1: <#FixMe#>') // no type anotation
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
          .replace(/^([a-zA-Z0-9\.]*$)/g, '$1: <#FixMe#>') // no type anotation
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