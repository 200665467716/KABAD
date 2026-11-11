/**
 * Recadre une image en carré et la réduit à `size` pixels, dans le navigateur, avant l'envoi.
 * Le serveur ne retouche aucune image (pas de bibliothèque d'images côté serveur, voir tools/no-sharp) :
 * il reçoit un fichier déjà léger, quelques dizaines de Ko, adapté à une connexion lente.
 */
export async function squareImage(file: Blob, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  // The centre of the picture is kept.
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  // WebP where the browser can write it; otherwise the browser falls back to PNG, which the server accepts too.
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/webp", 0.85));
}
