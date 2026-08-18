// Composites a small red unread-dot onto the site's existing favicon at
// runtime — used by useUnreadTabNotifier (T4.7) so a backgrounded tab gets
// a visible badge without a second icon asset checked into the repo.
export function buildBadgedFavicon(baseHref: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 32;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size - 7, 7, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not load base favicon"));
    img.src = baseHref;
  });
}
