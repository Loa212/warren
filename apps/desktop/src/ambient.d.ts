// Ambient type declarations for the Warren desktop app
// These work around type issues in Electrobun's bundled dependencies.

// Electrobun bundles three.js but doesn't ship @types/three.
// Declare as any to prevent TS7016 errors when tsc follows imports into Electrobun.
declare module 'three' {
  const THREE: unknown
  export = THREE
  export default THREE
}
