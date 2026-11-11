/** Lowercase, without accents: what the searches of the home screen compare. */
export const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
