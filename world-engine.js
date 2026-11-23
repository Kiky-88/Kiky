/* Original campus movement model, independent of rendering and page navigation. */
(() => {
  const width = 980, height = 560, step = 20;
  const buildings = [
    { x: 150, y: 80, w: 180, h: 120, type: 'library' },
    { x: 650, y: 80, w: 170, h: 120, type: 'lab' },
    { x: 150, y: 350, w: 180, h: 110, type: 'academy' },
    { x: 650, y: 350, w: 180, h: 110, type: 'studio' },
    { x: 432, y: 75, w: 116, h: 65, type: 'tower' }
  ];
  const places = {
    publications: { x: 250, y: 250, title: 'Publications', kicker: 'THE ARCHIVE', description: 'Efficient AI, multimodal models, and agent evaluation. Explore 12 publications and manuscripts, including QuantVLA and OS-Omni.', href: 'publications.html' },
    experience: { x: 730, y: 250, title: 'Experience', kicker: 'THE SYSTEMS LAB', description: 'Research at The Ohio State University and an internship at TouchstoneAI. From low-bit inference to coding-agent evaluation.', href: 'experience.html' },
    education: { x: 250, y: 490, title: 'Education', kicker: 'THE ACADEMY', description: 'A path through architecture, digital fabrication, and computer science at HUST, Michigan, and Penn.', href: 'education.html' },
    beyond: { x: 730, y: 490, title: 'Beyond CS', kicker: 'THE DESIGN STUDIO', description: 'Architecture and computational making: Dissolved Skyscraper, 4D-City, and Serpentine Gallery.', href: 'beyond.html' }
  };
  function walkable(x, y) {
    if (x < 60 || x > 920 || y < 55 || y > 515) return false;
    return !buildings.some(b => x > b.x - 13 && x < b.x + b.w + 13 && y > b.y - 17 && y < b.y + b.h + 20);
  }
  function findPath(from, to) {
    const cols = width / step, rows = height / step;
    const cell = p => ({ x: Math.floor(p.x / step), y: Math.floor(p.y / step) });
    const a = cell(from), b = cell(to), key = p => p.y * cols + p.x;
    const queue = [a], previous = new Map([[key(a), null]]);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      if (p.x === b.x && p.y === b.y) {
        const path = []; let current = p;
        while (current) { path.unshift({ x: current.x * step + step / 2, y: current.y * step + step / 2 }); current = previous.get(key(current)); }
        return path;
      }
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const next = { x: p.x + dx, y: p.y + dy };
        if (next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows || previous.has(key(next)) || !walkable(next.x * step + step / 2, next.y * step + step / 2)) continue;
        previous.set(key(next), p); queue.push(next);
      }
    }
    return [];
  }
  globalThis.ResearchWorldCore = { width, height, buildings, places, walkable, findPath };
})();
