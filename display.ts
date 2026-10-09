// Control characters, plus the bidi and zero-width marks that can reorder or hide text.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff]/g;

/**
 * Git hands back file names and paths byte for byte, and on macOS and Linux a file name
 * can contain terminal control characters. Printed raw, one could clear, reorder or hide
 * the warnings shown before a deletion, so those characters are shown as escapes instead.
 */
export function printable(text: string): string {
  return text.replace(UNSAFE, (char) => {
    const code = char.charCodeAt(0);
    return code <= 0xff ? `\\x${code.toString(16).padStart(2, '0')}` : `\\u${code.toString(16).padStart(4, '0')}`;
  });
}
