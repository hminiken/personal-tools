// Neutral inline placeholder for missing/broken images. Inline so the app
// doesn't depend on an outside placeholder service (placehold.co) loading.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#e9ecef"/>' +
      '<path d="M70 125l22-28 16 20 12-14 20 22H70z" fill="#ced4da"/>' +
      '<circle cx="82" cy="82" r="9" fill="#ced4da"/>' +
      '</svg>',
  );
