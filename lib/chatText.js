const NAMED_ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  bull: "•",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function normalizeChatText(value) {
  let text = String(value ?? "");

  // Descriptions can be encoded more than once, e.g. &amp;nbsp;.
  for (let pass = 0; pass < 6; pass += 1) {
    const decoded = text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/giu, (entity, code) => {
      if (code[0] !== "#") return NAMED_ENTITIES[code.toLowerCase()] ?? entity;

      const isHex = code[1]?.toLowerCase() === "x";
      const point = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isInteger(point) || point < 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return entity;
      return String.fromCodePoint(point);
    });
    if (decoded === text) break;
    text = decoded;
  }

  return text
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "");
}
