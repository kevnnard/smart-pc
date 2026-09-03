/**
 * clsx-style class joiner.
 *
 * Accepts the union of the values clsx supports and produces a single
 * space-separated class string with all falsy entries dropped. The function
 * preserves the order of inputs (including duplicates) so callers can rely on
 * Tailwind's source-order "last-wins" conflict resolution at the CSS layer.
 *
 * Used throughout the smart-pc UI to compose Tailwind utility classes from
 * props, conditional flags, and arrays without resorting to template strings.
 */
export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassDictionary
  | ClassArray;

export interface ClassDictionary {
  [id: string]: boolean | undefined | null;
}

export interface ClassArray extends Array<ClassValue> {}

const toVal = (mix: ClassValue): string => {
  if (typeof mix === "string") {
    return mix;
  }

  if (typeof mix === "number") {
    // Mirror clsx: drop 0 and NaN, keep finite non-zero numbers.
    return Number.isFinite(mix) && mix !== 0 ? String(mix) : "";
  }

  if (typeof mix !== "object" || mix === null) {
    return "";
  }

  if (Array.isArray(mix)) {
    let out = "";
    for (let i = 0; i < mix.length; i++) {
      const v = toVal(mix[i] as ClassValue);
      if (v) {
        out = out ? `${out} ${v}` : v;
      }
    }
    return out;
  }

  // ClassDictionary — keys whose values are truthy
  let out = "";
  for (const key in mix as ClassDictionary) {
    if (Object.hasOwn(mix, key) && (mix as ClassDictionary)[key]) {
      out = out ? `${out} ${key}` : key;
    }
  }
  return out;
};

/**
 * Join any combination of strings, numbers, booleans, objects, arrays, and
 * nullish values into a single class string.
 *
 * Falsy entries (`false`, `undefined`, `null`, `\"\"`, `0`) are dropped. Object
 * keys are included when their value is truthy. Arrays are flattened
 * recursively.
 *
 * @example
 *   cn("base", { active: true, disabled: false }, ["px-2", null, "py-1"])
 *   // => "base active px-2 py-1"
 */
export function cn(...inputs: ClassValue[]): string {
  let out = "";
  for (let i = 0; i < inputs.length; i++) {
    const v = toVal(inputs[i] as ClassValue);
    if (v) {
      out = out ? `${out} ${v}` : v;
    }
  }
  return out;
}
