const paths = {
  day: `${import.meta.env.BASE_URL}assets/bay-day.webp`,
  night: `${import.meta.env.BASE_URL}assets/bay-night.webp`,
  fish: `${import.meta.env.BASE_URL}assets/fish.webp`,
  jelly: `${import.meta.env.BASE_URL}assets/jelly.webp`,
  ray: `${import.meta.env.BASE_URL}assets/ray.webp`,
};

export async function loadAssets() {
  const entries = await Promise.all(Object.entries(paths).map(([key, src]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => reject(new Error(`无法载入 ${src}`));
    img.src = src;
  })));
  return Object.fromEntries(entries);
}
