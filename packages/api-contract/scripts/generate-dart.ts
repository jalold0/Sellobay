// `openapi.json` dan Dart modellarini yozadi.
//
// NEGA KERAK: Dart modellari qo'lda yozilgan edi — 946 qator. Server
// javobiga maydon qo'shilganda uni Dart tomonida ham qo'lda qo'shish
// kerak bo'lardi va esdan chiqsa, maydon jim yo'qolardi (kompilyator
// buni ko'rmaydi: JSON `Map<String, dynamic>`). Endi manba bitta.
//
// NEGA openapi-generator EMAS: rasmiy generator Java talab qiladi,
// o'nlab fayl va o'ziga xos `ApiClient` yozadi — bizda esa dio ustida
// ishlaydigan, token yangilash va xato konvertini biladigan O'Z
// klientimiz bor. Bizga faqat MODEL kerak, butun qatlam emas.
//
// Ishga tushirish (repo root'dan):
//   pnpm api:dart

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SPEC = join(here, '..', 'openapi.json');
const OUT_DIR = join(
  here,
  '..',
  '..',
  '..',
  'apps',
  'flutter',
  'shared',
  'lib',
  'src',
  'generated',
);

interface SchemaNode {
  /** OpenAPI 3.1 da nullable maydon uchun massiv: `["string", "null"]`. */
  type?: string | string[];
  format?: string;
  enum?: string[];
  items?: SchemaNode;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  description?: string;
  $ref?: string;
  anyOf?: SchemaNode[];
  oneOf?: SchemaNode[];
  nullable?: boolean;
}

const spec = JSON.parse(readFileSync(SPEC, 'utf8')) as {
  components: { schemas: Record<string, SchemaNode> };
};

const schemas = spec.components.schemas;

/** `#/components/schemas/Delivery` -> `Delivery` */
function refName(ref: string): string {
  return ref.split('/').pop()!;
}

/**
 * `anyOf: [X, {type: null}]` — Zod `.nullable()` shundan chiqadi.
 * Haqiqiy turni ajratib, `null` bo'lishini alohida qaytaramiz.
 */
function unwrapNullable(node: SchemaNode): { inner: SchemaNode; nullable: boolean } {
  // OpenAPI 3.1 da `.nullable()` TUR RO'YXATI bo'lib chiqadi:
  // `{ "type": ["string", "null"] }`. 3.0 dagi `nullable: true` emas.
  // Buni hisobga olmaganimda barcha nullable maydonlar `dynamic`
  // bo'lib qolgan edi — ya'ni tip generatsiyasining butun foydasi
  // yo'qolardi.
  if (Array.isArray(node.type)) {
    const types = node.type as string[];
    const nonNull = types.filter((t) => t !== 'null');
    return {
      inner: { ...node, type: nonNull[0] },
      nullable: types.length !== nonNull.length,
    };
  }

  const variants = node.anyOf ?? node.oneOf;
  if (!variants) return { inner: node, nullable: node.nullable === true };

  const nonNull = variants.filter((v) => v.type !== 'null');
  const hasNull = variants.length !== nonNull.length;
  if (nonNull.length === 1) return { inner: nonNull[0]!, nullable: hasNull };
  // Bir nechta variant — generator uni ifodalay olmaydi, `dynamic`.
  return { inner: { type: 'any' }, nullable: hasNull };
}

function dartType(node: SchemaNode): string {
  const { inner } = unwrapNullable(node);

  if (inner.$ref) {
    const name = refName(inner.$ref);
    // Enum `String` bo'lib chiqadi: qiymatlar `<Name>Values` da
    // konstanta sifatida turadi. Dart `enum` qilsak, server yangi
    // qiymat qo'shganda eski ilova uni o'gira olmay yiqilardi.
    return schemas[name]?.enum ? 'String' : name;
  }
  if (inner.enum) return 'String';

  switch (inner.type) {
    case 'string':
      if (inner.format === 'money') return 'Decimal';
      if (inner.format === 'date-time') return 'DateTime';
      return 'String';
    case 'integer':
      return 'int';
    case 'number':
      return 'double';
    case 'boolean':
      return 'bool';
    case 'array':
      return `List<${inner.items ? dartType(inner.items) : 'dynamic'}>`;
    case 'object':
      return 'Map<String, dynamic>';
    default:
      return 'dynamic';
  }
}

/** JSON qiymatini Dart turiga o'giradigan ifoda. */
function fromJsonExpr(node: SchemaNode, access: string, nullable: boolean): string {
  const { inner } = unwrapNullable(node);

  if (inner.$ref) {
    const name = refName(inner.$ref);
    if (schemas[name]?.enum) {
      return nullable
        ? `${access} == null ? null : ${access} as String`
        : `${access} as String? ?? ''`;
    }
    return nullable
      ? `${access} == null ? null : ${name}.fromJson(${access} as Map<String, dynamic>)`
      : `${name}.fromJson((${access} as Map<String, dynamic>?) ?? const {})`;
  }

  switch (inner.type) {
    case 'string':
      if (inner.format === 'money') {
        // Pul HAR DOIM satr sifatida keladi va `Decimal` ga o'giriladi —
        // `double` da 0.1 + 0.2 aniq chiqmaydi.
        return nullable
          ? `${access} == null ? null : parseMoney(${access})`
          : `parseMoney(${access})`;
      }
      if (inner.format === 'date-time') {
        // `tryParse` — buzuq sana butun javobni yiqitmasin.
        return `DateTime.tryParse(${access} as String? ?? '')`;
      }
      return nullable ? `${access} as String?` : `${access} as String? ?? ''`;
    case 'integer':
      return nullable ? `(${access} as num?)?.toInt()` : `(${access} as num?)?.toInt() ?? 0`;
    case 'number':
      return nullable ? `(${access} as num?)?.toDouble()` : `(${access} as num?)?.toDouble() ?? 0`;
    case 'boolean':
      return nullable ? `${access} as bool?` : `${access} as bool? ?? false`;
    case 'array': {
      const item = inner.items ?? { type: 'any' };
      const elem = fromJsonExpr(item, 'e', false);
      const listType = dartType(item);
      const cast = listType === 'Map<String, dynamic>' ? 'Map<String, dynamic>' : 'dynamic';
      return `(${access} as List<dynamic>? ?? const []).map((e) => ${elem.replace(/\be\b/g, cast === 'dynamic' ? 'e' : 'e')}).toList()`;
    }
    case 'object':
      return nullable
        ? `${access} as Map<String, dynamic>?`
        : `(${access} as Map<String, dynamic>?) ?? const {}`;
    default:
      return access;
  }
}

function docComment(text: string | undefined, indent = '  '): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => `${indent}/// ${line}`.trimEnd())
    .join('\n')
    .concat('\n');
}

function generateClass(name: string, node: SchemaNode): string {
  const props = node.properties ?? {};
  const required = new Set(node.required ?? []);

  const fields = Object.entries(props).map(([key, prop]) => {
    const { nullable } = unwrapNullable(prop);
    const isNullable = nullable || !required.has(key);
    const type = dartType(prop);
    // `DateTime` har doim nullable: `tryParse` null qaytarishi mumkin.
    const effectiveNullable = isNullable || type === 'DateTime';
    return {
      key,
      dart: toCamel(key),
      type: `${type}${effectiveNullable ? '?' : ''}`,
      nullable: effectiveNullable,
      raw: prop,
      description: prop.description,
    };
  });

  const ctorParams = fields
    .map((f) => `    ${f.nullable ? '' : 'required '}this.${f.dart},`)
    .join('\n');
  const fromJsonLines = fields
    .map((f) => `      ${f.dart}: ${fromJsonExpr(f.raw, `json['${f.key}']`, f.nullable)},`)
    .join('\n');
  const fieldLines = fields
    .map((f) => `${docComment(f.description)}  final ${f.type} ${f.dart};`)
    .join('\n\n');

  return `${docComment(node.description, '')}class ${name} {
  const ${name}({
${ctorParams}
  });

  factory ${name}.fromJson(Map<String, dynamic> json) => ${name}(
${fromJsonLines}
      );

${fieldLines}
}`;
}

/**
 * Dart'ning ZAHIRALANGAN so'zlari.
 *
 * `RETURN` qiymati `return` ga aylanib, kompilyatsiya qilinmaydigan kod
 * bergan edi. Ro'yxat to'liq emas — faqat sxemalarda uchrashi mumkin
 * bo'lganlari; yangisi chiqsa shu yerga qo'shiladi va generator darhol
 * to'g'ri nom beradi.
 */
const DART_RESERVED = new Set([
  'abstract',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'covariant',
  'default',
  'deferred',
  'do',
  'dynamic',
  'else',
  'enum',
  'export',
  'extends',
  'extension',
  'external',
  'factory',
  'false',
  'final',
  'finally',
  'for',
  'function',
  'get',
  'hide',
  'if',
  'implements',
  'import',
  'in',
  'interface',
  'is',
  'late',
  'library',
  'mixin',
  'new',
  'null',
  'on',
  'operator',
  'part',
  'required',
  'rethrow',
  'return',
  'sealed',
  'set',
  'show',
  'static',
  'super',
  'switch',
  'sync',
  'this',
  'throw',
  'true',
  'try',
  'typedef',
  'var',
  'void',
  'when',
  'while',
  'with',
  'yield',
]);

function toCamel(key: string): string {
  const camel = key.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase());
  // Oxiriga pastki chiziq — Dart uslubida qabul qilingan yechim.
  return DART_RESERVED.has(camel) ? `${camel}_` : camel;
}

// --- yozish ---------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

const classes: string[] = [];
const enums: string[] = [];

for (const [name, node] of Object.entries(schemas)) {
  if (node.enum) {
    // Enum qiymatlari KONSTANTA sifatida chiqadi, Dart `enum` emas.
    //
    // Sabab: server yangi qiymat qo'shsa (masalan yangi yetkazish
    // holati), eski ilova uni `enum` ga o'gira olmay YIQILARDI.
    // Satr bo'lsa ilova uni xom ko'rsatadi va ishlashda davom etadi.
    enums.push(
      `/// \`${name}\` — serverdagi qiymatlar.\n///\n/// Dart \`enum\` EMAS: server yangi qiymat qo'shsa eski ilova yiqilmasin.\nabstract final class ${name}Values {\n${node.enum
        .map((v) => `  static const ${toCamel(v.toLowerCase())} = '${v}';`)
        .join(
          '\n',
        )}\n\n  static const all = <String>[${node.enum.map((v) => `'${v}'`).join(', ')}];\n}`,
    );
    continue;
  }
  if (node.type === 'object' || node.properties) {
    classes.push(generateClass(name, node));
  }
}

const header = `// GENERATSIYA QILINGAN — QO'LDA TAHRIRLAMANG.
//
// Manba: packages/api-contract (Zod sxemalari -> openapi.json).
// Yangilash: \`pnpm api:dart\` (repo root'dan).
//
// Maydon qo'shish kerak bo'lsa — \`packages/api-contract/src/*.ts\` da
// qo'shing: shunda TypeScript tipi ham, bu fayl ham birga yangilanadi.

import 'package:decimal/decimal.dart';

import '../utils/money.dart';
`;

writeFileSync(
  join(OUT_DIR, 'api_models.dart'),
  `${header}\n${[...enums, ...classes].join('\n\n')}\n`,
  'utf8',
);

console.log(`api_models.dart — ${classes.length} ta klass, ${enums.length} ta qiymat to'plami`);
