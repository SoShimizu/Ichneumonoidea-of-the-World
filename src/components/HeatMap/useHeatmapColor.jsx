// hooks/useHeatmapColor.js
export const defaultGradient = [
  [0, 162, 255],     // light blue
  [255, 255, 0],     // yellow
  [255, 165, 0],     // orange
  [255, 0, 0],       // red
  [139, 69, 19],     // dark brown
];

export function useHeatmapColor(gradient = defaultGradient) {
  const interpolateColor = (value) => {
    const steps = gradient.length - 1;
    const step = Math.min(Math.floor(value * steps), steps - 1);
    const ratio = value * steps - step;
    const start = gradient[step];
    const end = gradient[step + 1];
    const result = start.map((s, i) =>
      Math.round(s + (end[i] - s) * ratio)
    );
    return `rgb(${result.join(",")})`;
  };

  const gradientCSS = `linear-gradient(to right, ${gradient.map(rgb => `rgb(${rgb.join(",")})`).join(", ")})`;

  return { interpolateColor, gradientCSS };
}
