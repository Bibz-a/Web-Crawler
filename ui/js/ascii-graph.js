/**
 * Pure DOM ASCII web graph — no canvas.
 * Renders crawled links as a living node map on a character grid.
 */

const EDGE_CHARS = new Set(['─', '│', '┼', '├', '┤', '┬', '┴', '╲', '╱', '·']);

function escapeHtml(ch) {
  if (ch === '&') return '&amp;';
  if (ch === '<') return '&lt;';
  if (ch === '>') return '&gt;';
  return ch;
}

export class AsciiWebGraph {
  constructor(container, cols = 56, rows = 20) {
    this.container = container;
    this.cols = cols;
    this.rows = rows;
    this.grid = this._emptyGrid();
    this.nodes = new Map();
    this.activeId = null;
    this._cellMeta = new Map();
    this._pre = null;
    this._renderGrid();
  }

  _emptyGrid() {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ' ')
    );
  }

  _renderGrid() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this._pre = document.createElement('pre');
    this._pre.className = 'ascii-graph__grid';
    this.container.appendChild(this._pre);
    this._flush();
  }

  _metaKey(row, col) {
    return `${row},${col}`;
  }

  _flush() {
    if (!this._pre) return;

    const html = this.grid
      .map((row, r) =>
        row
          .map((ch, c) => {
            const meta = this._cellMeta.get(this._metaKey(r, c));
            if (meta?.className) {
              return `<span class="${meta.className}">${escapeHtml(ch)}</span>`;
            }
            if (EDGE_CHARS.has(ch)) {
              return `<span class="ascii-graph__cell--edge">${escapeHtml(ch)}</span>`;
            }
            return escapeHtml(ch);
          })
          .join('')
      )
      .join('\n');

    this._pre.innerHTML = html;
  }

  _setCell(row, col, char, className = '') {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.grid[row][col] = char;
    const key = this._metaKey(row, col);
    if (className) {
      this._cellMeta.set(key, { className });
    } else if (EDGE_CHARS.has(char)) {
      this._cellMeta.set(key, { className: 'ascii-graph__cell--edge' });
    } else {
      this._cellMeta.delete(key);
    }
  }

  reset() {
    this.grid = this._emptyGrid();
    this.nodes.clear();
    this.activeId = null;
    this._cellMeta.clear();
    this._flush();
  }

  addNode(id, parentId = null, opts = {}) {
    if (this.nodes.has(id)) {
      this.setActive(id);
      this._flush();
      return;
    }

    const depth =
      parentId && this.nodes.has(parentId)
        ? this.nodes.get(parentId).depth + 1
        : 0;

    const siblings = parentId
      ? [...this.nodes.values()].filter(n => n.parentId === parentId).length
      : 0;

    const pos = this._allocatePosition(depth, siblings, parentId);
    const char = opts.failed ? '×' : '○';
    const nodeClass = opts.failed
      ? 'ascii-graph__cell--fail'
      : 'ascii-graph__cell--node ascii-graph__cell--new';

    this.nodes.set(id, {
      id,
      parentId,
      depth,
      row: pos.row,
      col: pos.col,
      failed: !!opts.failed,
    });

    this._setCell(pos.row, pos.col, char, nodeClass);

    if (parentId && this.nodes.has(parentId)) {
      const parent = this.nodes.get(parentId);
      this._drawEdge(parent.row, parent.col, pos.row, pos.col);
    }

    this.setActive(id);
    this._flush();
  }

  setActive(id) {
    if (this.activeId && this.nodes.has(this.activeId)) {
      const prev = this.nodes.get(this.activeId);
      const prevChar = prev.failed ? '×' : '○';
      this._setCell(
        prev.row,
        prev.col,
        prevChar,
        prev.failed ? 'ascii-graph__cell--fail' : 'ascii-graph__cell--node'
      );
    }

    this.activeId = id;
    if (id && this.nodes.has(id)) {
      const node = this.nodes.get(id);
      const activeChar = node.failed ? '×' : '◆';
      this._setCell(node.row, node.col, activeChar, 'ascii-graph__cell--active');
    }

    this._flush();
  }

  _allocatePosition(depth, siblingIndex, parentId) {
    const rowStep = Math.max(2, Math.floor(this.rows / 7));
    const row = Math.min(1 + depth * rowStep, this.rows - 2);

    const nodesAtDepth = [...this.nodes.values()].filter(n => n.depth === depth).length;
    const index = nodesAtDepth;

    if (depth === 0) {
      return { row: 1, col: Math.floor(this.cols / 2) };
    }

    const parent = this.nodes.get(parentId);
    const spread = Math.max(4, Math.floor(this.cols / (depth + 2)));
    const offset = (index - Math.floor(nodesAtDepth / 2)) * spread;
    let col = parent.col + offset;

    col = Math.max(2, Math.min(this.cols - 3, col));

    while (this._occupied(row, col) && col < this.cols - 2) col++;
    if (this._occupied(row, col)) {
      col = Math.max(2, parent.col - spread);
      while (this._occupied(row, col) && col > 1) col--;
    }

    return { row, col };
  }

  _occupied(row, col) {
    const ch = this.grid[row]?.[col];
    return ch && ch !== ' ';
  }

  _drawEdge(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return;

    const midRow = r2;
    const startCol = Math.min(c1, c2);
    const endCol = Math.max(c1, c2);

    const vStart = Math.min(r1, midRow);
    const vEnd = Math.max(r1, midRow);
    for (let r = vStart; r <= vEnd; r++) {
      if (r === r1 && r === midRow) continue;
      const existing = this.grid[r][c1];
      if (existing === ' ' || existing === '·') {
        this._setCell(r, c1, '│', 'ascii-graph__cell--edge');
      } else if (existing === '─') {
        this._setCell(r, c1, '┼', 'ascii-graph__cell--edge');
      }
    }

    for (let c = startCol; c <= endCol; c++) {
      if (c === c1 && c === c2) continue;
      const existing = this.grid[midRow][c];
      if (existing === ' ' || existing === '·') {
        this._setCell(midRow, c, '─', 'ascii-graph__cell--edge');
      } else if (existing === '│') {
        this._setCell(midRow, c, '┼', 'ascii-graph__cell--edge');
      }
    }

    if (c1 !== c2 && r1 !== r2) {
      const existing = this.grid[midRow][c1];
      if (existing === '│' || existing === '─' || existing === ' ') {
        this._setCell(midRow, c1, '├', 'ascii-graph__cell--edge');
      }
    }
  }

  get nodeCount() {
    return this.nodes.size;
  }
}
