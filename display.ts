/**
 * Git hands back file names and paths byte for byte, and on macOS and Linux a file name
 * can contain terminal control characters. Printed raw, one could clear or rewrite the
 * warnings shown before a deletion, so control characters are shown as `\xNN` instead.
 */
export function printable(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point.
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`);
}
