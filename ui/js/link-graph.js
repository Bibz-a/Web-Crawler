import * as d3 from './vendor/d3.bundle.mjs';

function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function buildDemoGraph() {
  const seed = 'https://example.com';
  const origin = getOrigin(seed);
  const nodes = [];
  const links = [];
  const paths = [
    '/', '/about', '/docs', '/blog', '/api', '/contact',
    '/docs/guide', '/docs/api', '/blog/post-1', '/blog/post-2',
    '/team', '/careers', '/legal', '/status',
  ];

  nodes.push({
    id: seed,
    url: seed,
    depth: 0,
    failed: false,
    isSeed: true,
    external: false,
    statusCode: 200,
    crawlTime: '124ms',
  });

  for (let i = 1; i < 48; i++) {
    const external = i % 23 === 0;
    const path = paths[i % paths.length] + (i > paths.length ? `/${i}` : '');
    const url = external
      ? `https://cdn-${i}.external.net/ref/${i}`
      : `${origin}${path}`;
    const depth = 1 + (i % 4);
    const failed = i % 17 === 0;
    nodes.push({
      id: url,
      url,
      depth,
      failed,
      isSeed: false,
      external,
      statusCode: failed ? 404 : 200,
      crawlTime: `${80 + (i * 13) % 200}ms`,
    });
    const parent = i % 5 === 0 ? seed : nodes[Math.max(1, 1 + (i % (nodes.length - 1)))].id;
    links.push({ source: parent, target: url });
  }

  for (let i = 0; i < 30; i++) {
    const a = nodes[1 + (i * 3) % (nodes.length - 1)];
    const b = nodes[1 + (i * 7 + 2) % (nodes.length - 1)];
    if (a.id !== b.id) links.push({ source: a.id, target: b.id });
  }

  return { nodes, links, seedOrigin: origin, placeholder: true };
}

export class LinkGraph {
  constructor(container, tooltipEl, metaEl) {
    this.container = container;
    this.tooltipEl = tooltipEl;
    this.metaEl = metaEl;
    this.filters = {
      errors: true,
      external: true,
      depthMax: null,
    };
    this.allNodes = [];
    this.allLinks = [];
    this.seedOrigin = null;
    this.usePlaceholder = true;
    this.width = 0;
    this.height = 0;
    this.breatheTimer = null;

    this._initSvg();
    this._bindFilters();
    this._bindResize();
    this.loadDemo();
    this._startBreathing();
  }

  _initSvg() {
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('class', 'linkgraph-svg');

    this.zoomLayer = this.svg.append('g');
    this.linkLayer = this.zoomLayer.append('g').attr('class', 'linkgraph-links');
    this.nodeLayer = this.zoomLayer.append('g').attr('class', 'linkgraph-nodes');

    this.zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        this.zoomLayer.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);
  }

  _bindFilters() {
    document.querySelectorAll('.graph-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.filter;
        if (key === 'depth2') {
          this._toggleDepthFilter(btn, 2);
        } else if (key === 'depth3') {
          this._toggleDepthFilter(btn, 3);
        } else if (key === 'errors') {
          this.filters.errors = !this.filters.errors;
          btn.classList.toggle('graph-filter--active', this.filters.errors);
        } else if (key === 'external') {
          this.filters.external = !this.filters.external;
          btn.classList.toggle('graph-filter--active', this.filters.external);
        }
        this._renderFiltered();
      });
    });
  }

  _toggleDepthFilter(btn, depth) {
    const other = document.querySelector(
      `.graph-filter[data-filter="${depth === 2 ? 'depth3' : 'depth2'}"]`
    );
    if (this.filters.depthMax === depth) {
      this.filters.depthMax = null;
      btn.classList.remove('graph-filter--active');
    } else {
      this.filters.depthMax = depth;
      btn.classList.add('graph-filter--active');
      other?.classList.remove('graph-filter--active');
    }
  }

  _bindResize() {
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.container);
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(rect.width, 320);
    this.height = Math.max(rect.height, 360);
    this.svg
      .attr('width', this.width)
      .attr('height', this.height);

    if (this.simulation) {
      this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
      this.simulation.alpha(0.08).restart();
    }
  }

  loadDemo() {
    const demo = buildDemoGraph();
    this.allNodes = demo.nodes;
    this.allLinks = demo.links;
    this.seedOrigin = demo.seedOrigin;
    this.usePlaceholder = true;
    this._updateMeta(2847, 14302);
    this._renderFiltered();
  }

  syncFromEngine(engine, responseMs) {
    if (!engine.nodes.length) return;

    this.usePlaceholder = false;
    this.seedOrigin = getOrigin(engine.seedUrl);

    this.allNodes = engine.nodes.map((n) => ({
      id: n.url,
      url: n.url,
      depth: n.depth,
      failed: n.failed,
      isSeed: n.url === engine.seedUrl,
      external: this._isExternal(n.url),
      statusCode: n.failed ? 404 : 200,
      crawlTime: `${responseMs ?? 100}ms`,
    }));

    this.allLinks = engine.edges.map((e) => ({
      source: e.from,
      target: e.to,
    }));

    this._updateMeta(this.allNodes.length, this.allLinks.length);
    this._renderFiltered();
  }

  _isExternal(url) {
    if (!this.seedOrigin) return false;
    const o = getOrigin(url);
    return o !== null && o !== this.seedOrigin;
  }

  _updateMeta(nodeCount, edgeCount) {
    if (!this.metaEl) return;
    this.metaEl.textContent =
      `${nodeCount.toLocaleString()} nodes · ${edgeCount.toLocaleString()} edges`;
  }

  _getFiltered() {
    let nodes = [...this.allNodes];

    if (!this.filters.errors) {
      nodes = nodes.filter((n) => !n.failed);
    }
    if (!this.filters.external) {
      nodes = nodes.filter((n) => !n.external);
    }
    if (this.filters.depthMax !== null) {
      nodes = nodes.filter((n) => n.depth <= this.filters.depthMax);
    }

    const ids = new Set(nodes.map((n) => n.id));
    const links = this.allLinks.filter(
      (l) => ids.has(l.source) && ids.has(l.target)
        || ids.has(l.source?.id ?? l.source) && ids.has(l.target?.id ?? l.target)
    ).map((l) => ({
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
    })).filter((l) => ids.has(l.source) && ids.has(l.target));

    return { nodes, links };
  }

  _renderFiltered() {
    const { nodes, links } = this._getFiltered();

    if (!this.usePlaceholder) {
      this._updateMeta(nodes.length, links.length);
    }

    if (this.simulation) this.simulation.stop();

    nodes.forEach((n) => {
      if (n.x == null) {
        n.x = this.width / 2 + (Math.random() - 0.5) * 80;
        n.y = this.height / 2 + (Math.random() - 0.5) * 80;
      }
    });

    const linkSel = this.linkLayer.selectAll('line').data(links, (d) => `${d.source}-${d.target}`);
    linkSel.exit().remove();
    linkSel.enter()
      .append('line')
      .attr('class', 'linkgraph-edge')
      .merge(linkSel);

    const nodeSel = this.nodeLayer.selectAll('g').data(nodes, (d) => d.id);
    nodeSel.exit().remove();

    const nodeEnter = nodeSel.enter()
      .append('g')
      .attr('class', 'linkgraph-node')
      .call(this._drag());

    nodeEnter.append('circle').attr('class', 'linkgraph-node__circle');
    const merged = nodeEnter.merge(nodeSel);

    merged.select('circle')
      .attr('r', (d) => (d.isSeed ? 9 : 5))
      .attr('fill', (d) => (d.failed ? '#0D0D0D' : d.isSeed ? '#111111' : '#0D0D0D'))
      .attr('stroke', (d) => {
        if (d.failed) return '#FF3B3B';
        if (d.isSeed) return '#00FF41';
        return '#1F1F1F';
      })
      .attr('stroke-width', (d) => (d.isSeed ? 2 : 1));

    merged
      .on('mouseenter', (event, d) => this._showTooltip(event, d))
      .on('mousemove', (event) => this._moveTooltip(event))
      .on('mouseleave', () => this._hideTooltip());

    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(52).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-28))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collide', d3.forceCollide().radius((d) => (d.isSeed ? 16 : 10)))
      .velocityDecay(0.55)
      .alphaDecay(0.015)
      .alphaMin(0.001)
      .on('tick', () => {
        this.linkLayer.selectAll('line')
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y);

        this.nodeLayer.selectAll('g')
          .attr('transform', (d) => `translate(${d.x},${d.y})`);
      });
  }

  _drag() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.12).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  _showTooltip(event, d) {
    if (!this.tooltipEl) return;
    this.tooltipEl.hidden = false;
    this.tooltipEl.replaceChildren();

    const urlDiv = document.createElement('div');
    urlDiv.className = 'linkgraph-tooltip__url';
    urlDiv.textContent = String(d.url ?? '');

    const rows = [
      ['Depth', d.depth],
      ['Status', d.statusCode],
      ['Crawl time', d.crawlTime],
    ];

    this.tooltipEl.appendChild(urlDiv);
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'linkgraph-tooltip__row';
      const labelSpan = document.createElement('span');
      labelSpan.textContent = label;
      const valueSpan = document.createElement('span');
      valueSpan.textContent = String(value ?? '');
      row.append(labelSpan, valueSpan);
      this.tooltipEl.appendChild(row);
    });

    this._moveTooltip(event);
  }

  _moveTooltip(event) {
    if (!this.tooltipEl || this.tooltipEl.hidden) return;
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left + 14;
    const y = event.clientY - rect.top + 14;
    this.tooltipEl.style.left = `${Math.min(x, rect.width - 280)}px`;
    this.tooltipEl.style.top = `${Math.min(y, rect.height - 100)}px`;
  }

  _hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.hidden = true;
  }

  _esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _startBreathing() {
    this.breatheTimer = setInterval(() => {
      if (!this.simulation) return;
      if (this.simulation.alpha() < 0.04) {
        this.simulation.alphaTarget(0.018).restart();
        setTimeout(() => {
          if (this.simulation) this.simulation.alphaTarget(0);
        }, 900);
      }
    }, 4200);
  }

  clearForCrawl(seedUrl) {
    this.usePlaceholder = false;
    this.allNodes = [];
    this.allLinks = [];
    this.seedOrigin = getOrigin(seedUrl);
    this._updateMeta(0, 0);
    this.nodeLayer.selectAll('g').remove();
    this.linkLayer.selectAll('line').remove();
  }

  reset() {
    this.loadDemo();
  }

  resize() {
    this._resize();
  }

  destroy() {
    if (this.breatheTimer) clearInterval(this.breatheTimer);
    if (this._ro) this._ro.disconnect();
    if (this.simulation) this.simulation.stop();
  }
}
