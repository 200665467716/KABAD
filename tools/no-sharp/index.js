// sharp est volontairement absent : sa dépendance libvips est sous LGPL, interdite par le règlement du CADEV.
// next.config.ts désactive l'optimisation d'images, qui est la seule fonction de Next.js à l'utiliser.
module.exports = function sharp() {
  throw new Error("sharp n’est pas installé dans KABAD (licence LGPL de libvips).");
};
