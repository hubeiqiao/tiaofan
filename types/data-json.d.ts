// Large, versioned source datasets are validated by the data audit scripts.
// Avoid inferring hundreds of thousands of literal types from their contents.
declare module '*.json' { const data: any; export default data; }
