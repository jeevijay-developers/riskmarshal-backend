/**
 * Chart Generator Utility
 * Generates SVG-based charts for PDF embedding
 */

/**
 * Generate a pie chart SVG
 * @param {Array<{label: string, value: number, color: string}>} data
 * @param {number} size - Chart size in pixels
 * @returns {string} SVG string
 */
const generatePieChart = (data, size = 200) => {
  if (!data || data.length === 0) {
    return generateEmptyState(size, "No data available");
  }

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  if (total === 0) {
    return generateEmptyState(size, "No data available");
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;

  let currentAngle = -90; // Start from top
  const paths = [];

  // Default colors if not provided
  const defaultColors = [
    "#3498db",
    "#e74c3c",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#e67e22",
    "#34495e",
  ];

  data.forEach((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const color = item.color || defaultColors[index % defaultColors.length];

    if (percentage >= 100) {
      // Full circle
      paths.push(`
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" />
      `);
    } else if (percentage > 0) {
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      paths.push(`
        <path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" 
              fill="${color}" stroke="white" stroke-width="1" />
      `);
    }

    currentAngle += angle;
  });

  // Generate legend
  const legendY = size + 15;
  const legendItems = data.map((item, index) => {
    const color = item.color || defaultColors[index % defaultColors.length];
    const percentage = ((item.value / total) * 100).toFixed(1);
    return `
      <g transform="translate(0, ${index * 18})">
        <rect x="5" y="${legendY}" width="12" height="12" fill="${color}" />
        <text x="22" y="${legendY + 10}" font-size="10" font-family="Helvetica">${item.label}: ${item.value} (${percentage}%)</text>
      </g>
    `;
  });

  const totalHeight = size + 20 + data.length * 18;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${totalHeight}" viewBox="0 0 ${size} ${totalHeight}">
      ${paths.join("")}
      ${legendItems.join("")}
    </svg>
  `;
};

/**
 * Generate a horizontal bar chart SVG
 * @param {Array<{label: string, value: number, color?: string}>} data
 * @param {number} width - Chart width
 * @param {number} barHeight - Height of each bar
 * @returns {string} SVG string
 */
const generateBarChart = (data, width = 300, barHeight = 25) => {
  if (!data || data.length === 0) {
    return generateEmptyState(width, "No data available");
  }

  const maxValue = Math.max(...data.map((d) => d.value || 0));
  if (maxValue === 0) {
    return generateEmptyState(width, "No data available");
  }

  const padding = { left: 100, right: 20, top: 10, bottom: 10 };
  const chartWidth = width - padding.left - padding.right;
  const gap = 8;
  const height = data.length * (barHeight + gap) + padding.top + padding.bottom;

  const defaultColors = [
    "#3498db",
    "#2ecc71",
    "#e74c3c",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
  ];

  const bars = data.map((item, index) => {
    const barWidth = (item.value / maxValue) * chartWidth;
    const y = padding.top + index * (barHeight + gap);
    const color = item.color || defaultColors[index % defaultColors.length];

    return `
      <g>
        <text x="${padding.left - 5}" y="${y + barHeight / 2 + 4}" 
              font-size="10" font-family="Helvetica" text-anchor="end">${truncateLabel(
                item.label,
                15
              )}</text>
        <rect x="${padding.left}" y="${y}" width="${Math.max(barWidth, 1)}" height="${barHeight}" 
              fill="${color}" rx="3" />
        <text x="${padding.left + barWidth + 5}" y="${y + barHeight / 2 + 4}" 
              font-size="10" font-family="Helvetica">${formatNumber(item.value)}</text>
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${bars.join("")}
    </svg>
  `;
};

/**
 * Generate a simple line chart SVG
 * @param {Array<{label: string, value: number}>} data
 * @param {number} width - Chart width
 * @param {number} height - Chart height
 * @returns {string} SVG string
 */
const generateLineChart = (data, width = 400, height = 200) => {
  if (!data || data.length === 0) {
    return generateEmptyState(width, "No data available");
  }

  const padding = { left: 50, right: 20, top: 20, bottom: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value || 0));
  const minValue = 0;

  if (maxValue === 0) {
    return generateEmptyState(width, "No data available");
  }

  const points = data.map((item, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const y =
      padding.top +
      chartHeight -
      ((item.value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, label: item.label, value: item.value };
  });

  // Generate path
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Generate area fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Y-axis labels
  const yLabels = [0, maxValue / 2, maxValue].map((val, i) => {
    const y = padding.top + chartHeight - (i / 2) * chartHeight;
    return `<text x="${padding.left - 5}" y="${y + 4}" font-size="9" font-family="Helvetica" text-anchor="end">${formatNumber(
      val
    )}</text>`;
  });

  // X-axis labels (show max 6)
  const step = Math.ceil(data.length / 6);
  const xLabels = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((item, i, arr) => {
      const index = data.indexOf(item);
      const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
      return `<text x="${x}" y="${height - 10}" font-size="8" font-family="Helvetica" text-anchor="middle">${truncateLabel(
        item.label,
        8
      )}</text>`;
    });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Grid lines -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${
    padding.top + chartHeight
  }" stroke="#ddd" />
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${
    padding.left + chartWidth
  }" y2="${padding.top + chartHeight}" stroke="#ddd" />
      
      <!-- Area fill -->
      <path d="${areaD}" fill="rgba(52, 152, 219, 0.2)" />
      
      <!-- Line -->
      <path d="${pathD}" fill="none" stroke="#3498db" stroke-width="2" />
      
      <!-- Points -->
      ${points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#3498db" />`).join("")}
      
      <!-- Labels -->
      ${yLabels.join("")}
      ${xLabels.join("")}
    </svg>
  `;
};

/**
 * Generate a summary stats card
 */
const generateStatsCard = (stats, width = 400) => {
  const cardHeight = 30;
  const gap = 5;
  const height = stats.length * (cardHeight + gap) + 10;

  const cards = stats.map((stat, index) => {
    const y = 5 + index * (cardHeight + gap);
    return `
      <g>
        <rect x="0" y="${y}" width="${width}" height="${cardHeight}" fill="#f8f9fa" rx="5" />
        <text x="10" y="${y + 20}" font-size="11" font-family="Helvetica" font-weight="bold">${stat.label}</text>
        <text x="${width - 10}" y="${y + 20}" font-size="12" font-family="Helvetica" text-anchor="end" fill="#3498db">${stat.value}</text>
      </g>
    `;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${cards.join("")}
    </svg>
  `;
};

/**
 * Generate empty state SVG
 */
const generateEmptyState = (size, message = "No data") => {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="60" viewBox="0 0 ${size} 60">
      <rect x="0" y="0" width="${size}" height="60" fill="#f8f9fa" rx="5" />
      <text x="${size / 2}" y="35" font-size="12" font-family="Helvetica" text-anchor="middle" fill="#666">${message}</text>
    </svg>
  `;
};

/**
 * Format number for display
 */
const formatNumber = (num) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return typeof num === "number" ? num.toLocaleString("en-IN") : num;
};

/**
 * Truncate label to max length
 */
const truncateLabel = (label, maxLen) => {
  if (!label) return "";
  return label.length > maxLen ? label.substring(0, maxLen - 2) + ".." : label;
};

module.exports = {
  generatePieChart,
  generateBarChart,
  generateLineChart,
  generateStatsCard,
  generateEmptyState,
  formatNumber,
};
