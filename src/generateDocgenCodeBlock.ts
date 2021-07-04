import path from "path";
import ts from "typescript";
import { ComponentDoc, PropItem } from "react-docgen-typescript";

export interface GeneratorOptions {
  filename: string;
  source: string;
  componentDocs: ComponentDoc[];
  setDisplayName: boolean;
  typePropName: string;
}
// eslint-disable-next-line no-shadow
enum EmpPropTypes {
  Input = "Input",
  InputNumber = "InputNumber",
  Slider = "Slider",
  Radio = "Radio",
  RadioGroup = "RadioGroup",
  Select = "Select",
  Switch = "Switch",
  TimePicker = "TimePicker",
  DatePicker = "DatePicker",
  RangePicker = "RangePicker",
  ColorPicker = "ColorPicker",
  Upload = "Upload",
  RichText = "RichText",
  StyleEdit = "StyleEdit",
}

/**
 * Inserts a ts-ignore comment above the supplied statement.
 *
 * It is used to work around type errors related to fields like empPropTypes not
 * being defined on types. It also prevents compile errors related to attempting
 * to assign to nonexistent components, which can happen due to incorrect
 * detection of component names when using the parser.
 * ```
 * // @ts-ignore
 * ```
 * @param statement
 */
function insertTsIgnoreBeforeStatement(statement: ts.Statement): ts.Statement {
  ts.setSyntheticLeadingComments(statement, [
    {
      text: " @ts-ignore", // Leading space is important here
      kind: ts.SyntaxKind.SingleLineCommentTrivia,
      pos: -1,
      end: -1,
    },
  ]);
  return statement;
}

/**
 * Set component display name.
 *
 * ```
 * SimpleComponent.displayName = "SimpleComponent";
 * ```
 */
function setDisplayName(d: ComponentDoc): ts.Statement {
  return insertTsIgnoreBeforeStatement(
    ts.createExpressionStatement(
      ts.createBinary(
        ts.createPropertyAccess(
          ts.createIdentifier(d.displayName),
          ts.createIdentifier("displayName")
        ),
        ts.SyntaxKind.EqualsToken,
        ts.createLiteral(d.displayName)
      )
    )
  );
}

/**
 * Set a component prop description.
 * ```
 * SimpleComponent.empPropTypes.props.someProp = {
 *   defaultValue: "blue",
 *   description: "Prop description.",
 *   name: "someProp",
 *   required: true,
 *   type: "'blue' | 'green'",
 * }
 * ```
 *
 * @param propName Prop name
 * @param prop Prop definition from `ComponentDoc.props`
 * @param options Generator options.
 */
function createPropDefinition(
  propName: string,
  prop: PropItem,
  options: GeneratorOptions
) {
  /**
   * Set default prop value.
   *
   * ```
   * SimpleComponent.empPropTypes.props.someProp.defaultValue = null;
   * SimpleComponent.empPropTypes.props.someProp.defaultValue = {
   *   value: "blue",
   * };
   * ```
   *
   * @param defaultValue Default prop value or null if not set.
   */
  const setDefaultValue = (
    defaultValue: { value: string | number | boolean } | null
  ) =>
    ts.createPropertyAssignment(
      ts.createLiteral("defaultValue"),
      // Use a more extensive check on defaultValue. Sometimes the parser
      // returns an empty object.
      defaultValue !== null &&
        defaultValue !== undefined &&
        typeof defaultValue === "object" &&
        "value" in defaultValue &&
        (typeof defaultValue.value === "string" ||
          typeof defaultValue.value === "number" ||
          typeof defaultValue.value === "boolean")
        ? ts.createLiteral(defaultValue.value)
        : ts.createNull()
    );

  /** Set a property with a string value */
  const setStringLiteralField = (fieldName: string, fieldValue: string) =>
    ts.createPropertyAssignment(
      ts.createLiteral(fieldName),
      ts.createLiteral(fieldValue)
    );

  /**
   * ```
   * SimpleComponent.empPropTypes.props.someProp.description = "Prop description.";
   * ```
   * @param description Prop description.
   */
  const setDescription = (p: PropItem) =>
    setStringLiteralField("description", p.description);

  /**
   * ```
   * SimpleComponent.empPropTypes.props.someProp.name = "someProp";
   * ```
   * @param name Prop name.
   */
  const setName = (name: string) => setStringLiteralField("label", name);

  /**
   * ```
   * SimpleComponent.empPropTypes.props.someProp.required = true;
   * ```
   * @param required Whether prop is required or not.
   */
  const setRequired = (required: boolean) =>
    ts.createPropertyAssignment(
      ts.createLiteral("required"),
      required ? ts.createTrue() : ts.createFalse()
    );

  /**
   * ```
   * SimpleComponent.empPropTypes.props.someProp.type = {
   *  name: "enum",
   *  value: [ { value: "\"blue\"" }, { value: "\"green\""} ]
   * }
   * ```
   * @param [typeValue] Prop value (for enums)
   */
  const setValue = (p: PropItem) => {
    const { value: typeValue, name: typeName } = p.type;
    if (typeName.includes("|")) {
      return ts.createArrayLiteral(
        typeName
          .split("|")
          .map((item) =>
            ts.createObjectLiteral([
              setStringLiteralField("value", item.trim()),
            ])
          )
      );
    }

    return Array.isArray(typeValue) &&
      typeValue.every((value) => typeof value.value === "string")
      ? ts.createArrayLiteral(
          typeValue.map((value) =>
            ts.createObjectLiteral([
              setStringLiteralField("value", value.value),
            ])
          )
        )
      : ts.createArrayLiteral([]);
  };

  const isSelectType = (p: PropItem) => {
    const { name: typeName, value: typeValue } = p.type;
    return (
      typeName === "enum" || (typeName.includes("|") && typeName.includes('"'))
    );
  };

  const getEmpPropsType = (p: PropItem) => {
    const { name: typeName, value: typeValue } = p.type;
    if (p.name.toLowerCase().includes("style")) console.log(p);
    const isNumber = (n: string) =>
      n === "number" ||
      n === "number | undefined" ||
      n.includes("string | number") ||
      n.includes("number | string");
    const isString = (n: string) =>
      n === "string" ||
      n === "string | undefined" ||
      n === "any" ||
      n === "ReactNode";
    const isBoolean = (n: string) =>
      n === "boolean" ||
      n === "boolean | undefined" ||
      n.includes('"true" | "false"');

    const isStyle = (pitem: PropItem) =>
      pitem.name.toLocaleLowerCase().includes("style") &&
      !isBoolean(pitem.type.name);

    if (isSelectType(p)) return EmpPropTypes.Select;
    if (isNumber(typeName.toLowerCase())) return EmpPropTypes.InputNumber;
    if (isBoolean(typeName.toLowerCase())) return EmpPropTypes.Switch;
    if (isStyle(p)) return EmpPropTypes.StyleEdit;
    // 最后才判断string
    if (isString(typeName.toLowerCase())) return EmpPropTypes.Input;
    return EmpPropTypes.Input;
  };
  /**
   * ```
   * SimpleComponent.empPropTypes.props.someProp.type = { name: "'blue' | 'green'"}
   * ```
   * @param typeName Prop type name.
   * @param [typeValue] Prop value (for enums)
   */

  const setType = (p: PropItem) => {
    return setStringLiteralField(options.typePropName, getEmpPropsType(p));
  };

  const setAntdOptions = (p: PropItem) => {
    return ts.createPropertyAssignment(
      ts.createLiteral("options"),
      ts.createObjectLiteral([
        ts.createPropertyAssignment(
          ts.createIdentifier("options"),
          setValue(p)
        ),
      ])
    );
  };

  const keyList = [
    setDefaultValue(prop.defaultValue),
    setDescription(prop),
    setName(prop.name),
    setRequired(prop.required),
    setType(prop),
  ];

  if (isSelectType(prop)) {
    keyList.push(setAntdOptions(prop));
  }

  return ts.createPropertyAssignment(
    ts.createLiteral(propName),
    ts.createObjectLiteral(keyList)
  );
}

/**
 * Sets the field `empPropTypes` for the component specified by the component
 * doc with the docgen information.
 *
 * ```
 * SimpleComponent.empPropTypes = {
 *   description: ...,
 *   displayName: ...,
 *   props: ...,
 * }
 * ```
 *
 * @param d Component doc.
 * @param options Generator options.
 */
function setComponentDocGen(
  d: ComponentDoc,
  options: GeneratorOptions
): ts.Statement {
  return insertTsIgnoreBeforeStatement(
    ts.createStatement(
      ts.createBinary(
        // SimpleComponent.empPropTypes
        ts.createPropertyAccess(
          ts.createIdentifier(d.displayName),
          ts.createIdentifier("empPropTypes")
        ),
        ts.SyntaxKind.EqualsToken,
        ts.createObjectLiteral([
          // SimpleComponent.empPropTypes.defined.description
          ts.createPropertyAssignment(
            ts.createLiteral("defined"),
            ts.createObjectLiteral([
              ts.createPropertyAssignment(
                ts.createIdentifier("description"),
                ts.createLiteral(d.description)
              ),
            ])
          ),
          // SimpleComponent.empPropTypes.displayName
          ts.createPropertyAssignment(
            ts.createLiteral("name"),
            ts.createLiteral(d.displayName)
          ),
          // SimpleComponent.empPropTypes.props
          ts.createPropertyAssignment(
            ts.createLiteral("props"),
            ts.createObjectLiteral(
              Object.entries(d.props).map(([propName, prop]) =>
                createPropDefinition(propName, prop, options)
              )
            )
          ),
        ])
      )
    )
  );
}

export function generateDocgenCodeBlock(options: GeneratorOptions): string {
  const sourceFile = ts.createSourceFile(
    options.filename,
    options.source,
    ts.ScriptTarget.ESNext
  );

  const relativeFilename = path
    .relative("./", path.resolve("./", options.filename))
    .replace(/\\/g, "/");

  const wrapInTryStatement = (statements: ts.Statement[]): ts.TryStatement =>
    ts.createTry(
      ts.createBlock(statements, true),
      ts.createCatchClause(
        ts.createVariableDeclaration(
          ts.createIdentifier("__react_docgen_typescript_loader_error")
        ),
        ts.createBlock([])
      ),
      undefined
    );

  const codeBlocks = options.componentDocs.map((d) =>
    wrapInTryStatement(
      [
        options.setDisplayName ? setDisplayName(d) : null,
        setComponentDocGen(d, options),
      ].filter((s) => s !== null) as ts.Statement[]
    )
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printNode = (sourceNode: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, sourceNode, sourceFile);

  // Concat original source code with code from generated code blocks.
  const result = codeBlocks.reduce(
    (acc, node) => `${acc}\n${printNode(node)}`,

    // Use original source text rather than using printNode on the parsed form
    // to prevent issue where literals are stripped within components.
    // Ref: https://github.com/strothj/react-docgen-typescript-loader/issues/7
    options.source
  );

  return result;
}
