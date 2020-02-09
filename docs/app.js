class Type {
  constructor(rawText) {
    this.rawText = rawText;
    this.typeName = Type.extractTypeName(rawText);
    this.storedProperties = Type.extractStoredProperties(rawText);
  }

  static extractTypeName(rawText) {
    const output = rawText
      .split("\n")
      .filter(line => line.includes('class') || line.includes('struct'))
      .join("")
      .replace(/.*(class|struct) ([a-zA-Z0-9]+).*/g, '$2')
    return output.length == 0 ? "<#FixMe#>" : output
  }

  static extractStoredProperties(rawText) {
    return rawText
      .split("\n")
      .filter(line => !line.includes('class') || !line.includes('struct')) // remove type definition
      .filter(line => !line.includes('{')) // remove computed property
      .filter(line => !(line.includes('let') && line.includes('='))) // remove let with default value
      .filter(line => line.includes('var') || line.includes('let')) // remove lines without let or var
      .map(function (line) {
        const property = new StoredProperty(line)
        return property
      });
  }
}

class StoredProperty {
  constructor(rawText) {
    let removedText = rawText
      .replace(/\/\/.*/g, '') // remove comment
      .replace(/@[a-zA-Z0-9]* /g, '') // remove attribute
      .replace(/(open|public|internal|fileprivate|private) /g, '') // remove access control
      .replace(/(let|var) /g, '') // remove let var
      .trim()

    this.propertyName = StoredProperty.extractPropertyName(removedText);
    this.typeName = StoredProperty.extractTypeName(removedText);
  }

  static extractPropertyName(rawText) {
    const value = rawText.match(/^([a-zA-Z0-9]*)/)

    if (value) {
      return value[1]
    }
    return "<#FixMe#>"
  }

  static extractTypeName(rawText) {
    switch (true) {
      case /= (false|true)$/.test(rawText):
        return 'Bool'

      case /= ".*"$/.test(rawText):
        return 'String'
    }

    const value = rawText.match(/: ([a-zA-Z0-9\.\?\]\[: ]*)/)
    if (value) {
      return value[1].trim()
    }
    return "<#FixMe#>"
  }

  get defaultValue() {
    switch (true) {
      case /^String$/.test(this.typeName):
        return '""'

      case /^(Int(|8|16|32|64)|Float|Double|CGFloat)$/.test(this.typeName):
        return '0'

      case /^(CGPoint|CGRect|CGSize)$/.test(this.typeName):
        return '.zero'

      case /^Decimal$/:
        return 'Decimal()'

      case /^URL$/.test(this.typeName):
        return 'URL(string: "https://sample.com")!'

      case /^Date$/.test(this.typeName):
        return 'Date()'

      case /^Data$/.test(this.typeName):
        return 'Data()'

      case /^Bool$/.test(this.typeName):
        return 'false'

      case /^.*\?$/.test(this.typeName): // Optional
        return 'nil'

      case /^\[.*: .*\]$/.test(this.typeName): // Disctionary
        return '[:]'

      case /^\[.*\]$/.test(this.typeName): // Collection
        return '[]'

      case /^<#FixMe#>$/.test(this.typeName):
        return '<#FixMe#>'

      default:
        return '.make()'
    }
  }
}

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
    var noTypeAnotationBool = true
}`
  },
  // mounted: function () {
  //   this.$nextTick(function () {
  //     hljs.initHighlighting()
  //   })
  // },
  computed: {
    storedPropertyLines() {
      return this.text
        .split("\n")
        .filter(line => !line.includes('class') || !line.includes('struct')) // remove type definition
        .filter(line => !line.includes('{')) // remove computed property
        .filter(line => !(line.includes('let') && line.includes('='))) // remove let with default value
        .filter(line => line.includes('var') || line.includes('let')) // remove lines without let or var
        .join("\n")
    },
    properties() {
      return this.storedPropertyLines
        .split("\n")
        .map(function (line) {
          const propertyName = line.match(/^([a-zA-Z0-9]*):/)[1]
          const propertyTypeName = line.match(/: ([a-zA-Z0-9]*)/)[1]
          const propertyDefaultValue = line.match(/= ([a-zA-Z0-9]*)$/)[1]
          const property = new Property(propertyName, propertyTypeName, propertyDefaultValue)
          return property
        });
    },
    type() {
      return new Type(this.text)
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
        .map(line => line.replace(/@[a-zA-Z0-9]* /g, '')) // remove attribute
        .map(line => line.replace(/(open|public|internal|fileprivate|private) /g,
          '')) // remove access control
        .map(line => line.replace(/(let|var) /g, '')) // remove let var
        .map(line => line.trim())
        .join("\n")
    },
    memberwiseInitializer: function (text, type) {
      if (text.length == 0) {
        return "\n"
      }
      parameters = type.storedProperties
        .map(line => `${line.propertyName}: ${line.typeName}`)
        .join(',\n        ')
      body = type.storedProperties
        .map(line => `self.${line.propertyName} = ${line.propertyName}`)
        .join("\n        ")
      return `extension ${type.typeName} {
    init(
        ${parameters}
    ) {
        ${body}
    }
}`
    },
    factoryMethod: function (text, type) {
      if (text.length == 0) {
        return "\n"
      }
      parameters = type.storedProperties
        .map(line => `${line.propertyName}: ${line.typeName} = ${line.defaultValue}`)
        .join(',\n        ')
      body = type.storedProperties
        .map(line => `${line.propertyName}: ${line.propertyName}`)
        .join(",\n            ")
      return `extension ${type.typeName} {
    static func make(
        ${parameters}
    ) -> ${type.typeName} {
        return ${type.typeName}(
            ${body}
        )
    }
}`
    },
    decodableInitializer: function (text, type) {
      if (text.length == 0) {
        return "\n"
      }
      body = type.storedProperties
        .map(line => `${line.propertyName} = try container.decode(${line.typeName}.self, forKey: .${line.propertyName})`)
        .join("\n        ")
      return `extension ${type.typeName}: Decodable {
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ${body}
    }
}`
    },
    encodableImplementation: function (text, type) {
      if (text.length == 0) {
        return "\n"
      }
      lines = text.split("\n")
      body = type.storedProperties
        .map(line => `try container.encode(${line.propertyName}, forKey: .${line.propertyName})`)
        .join("\n        ")
      return `extension ${type.typeName}: Encodable {
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        ${body}
    }
}`
    },
    equatable: function (text, type) {
      if (text.length == 0) {
        return "\n"
      }
      body = type.storedProperties
        .map(line => `lhs.${line.propertyName} == rhs.${line.propertyName}`)
        .join(" &&\n            ")
      return `extension ${type.typeName}: Equatable {
    static func == (lhs: ${type.typeName}, rhs: ${type.typeName}) -> Bool {
        return
            ${body}
    }
}`
    },
    matchable: function (text, type) {
      if (text.length == 0) {
        return "\n"
      }
      return `extension ${type.typeName}: Matchable {
    public var matcher: ParameterMatcher<${type.typeName}> {
        return equal(to: self)
    }
}`
    }
  }
});