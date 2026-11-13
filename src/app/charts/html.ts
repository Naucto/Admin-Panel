/** Text set into a tooltip's HTML, with every character that could open markup escaped. */
export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
