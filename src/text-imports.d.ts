/**
 * Files imported with `with { loader: 'text' }` arrive as their contents.
 * Interactive posts use this to load markup and styles into a shadow root.
 */
declare module '*.html' {
  const contents: string;
  export default contents;
}

declare module '*.css' {
  const contents: string;
  export default contents;
}
