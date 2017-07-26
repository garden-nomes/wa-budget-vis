import * as d3 from 'd3';
import numeral from 'numeral';
import budgets from '../data/budgets.json';
import './style.css';

const width = 960,
  height = 600;

let zoomed = false;

const color = d3.scaleOrdinal(d3.schemeCategory10);

const chart = d3.select('#chart');
const svg = chart.append('svg').attr('width', width).attr('height', height);

const cellLayer = svg.append('g');
const textLayer = svg.append('g');
const overlayLayer = svg.append('g');

const root = d3
  .hierarchy(budgets)
  .sum(d => d.funding * 1000)
  .sort((a, b) => b.value - a.value);

const treemap = d3.treemap().size([width, height]).padding(1);
display(root);

function display(node) {
  const newNode = node.copy();
  treemap(newNode);

  const reshape = d3.transition().duration(750);
  const fadeStart = d3.transition().duration(250);
  const fadeEnd = d3.transition().delay(500).duration(250);

  d3.select('.heading').select('h1').text(node.data.name);

  const labels = textLayer
    .selectAll('.label')
    .data(
      newNode.children.filter(d => d.value / d.parent.value > 0.01),
      d => d.data.name
    );

  labels.exit().transition(fadeStart).style('opacity', 0).remove();

  const label = labels
    .enter()
    .append('g')
    .attr('class', 'label')
    .attr('transform', d => `translate(${d.x0},${d.y0})`)
    .append('text')
    .text(d => d.data.name)
    .call(wrap);

  label.style('opacity', 0).transition(fadeEnd).style('opacity', 1);

  label
    .append('tspan')
    .attr('class', 'funding')
    .attr('x', '0')
    .attr('dx', '4px')
    .attr('dy', '1.2em')
    .text(d => numeral(d.value).format('($0.0 a)'));

  labels
    .transition(reshape)
    .attr('transform', d => `translate(${d.x0 + 2},${d.y0 + 2})`);

  const cells = cellLayer
    .selectAll('.cell')
    .data(newNode.leaves().filter(d => d.value > 0), d => d.data.name);

  cells.exit().transition(fadeStart).style('opacity', 0).remove();

  cells
    .enter()
    .append('g')
    .attr('class', 'cell')
    .attr('transform', d => `translate(${d.x0},${d.y0})`)
    .append('rect')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .style('fill', d => color(d.parent.data.name))
    .style('opacity', 0)
    .transition(fadeEnd)
    .style('opacity', 1);

  cells
    .transition(reshape)
    .attr('transform', d => `translate(${d.x0},${d.y0})`)
    .select('rect')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0);

  const overlays = overlayLayer
    .selectAll('.overlay')
    .data(
      newNode.descendants().filter(d => d.depth === 1 && d.value > 0),
      d => d.data.name
    );

  const overlay = overlays
    .enter()
    .append('g')
    .attr('class', 'overlay')
    .attr('transform', d => `translate(${d.x0},${d.y0})`)
    .append('rect')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .on('click', d => (zoomed ? display(root) : display(d)));

  overlay.style('opacity', 0).transition(fadeEnd).style('opacity', 1);
  overlay
    .append('title')
    .text(d => `${d.data.name}\n${numeral(d.value).format('$0.0 a')}`);

  overlays.exit().transition(fadeStart).style('opacity', 0).remove();

  overlays
    .transition(reshape)
    .attr('transform', d => `translate(${d.x0},${d.y0})`)
    .select('rect')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0);

  overlay
    .filter(d => d.value / d.parent.value <= 0.01)
    .on('mouseover', d => {
      const popup = d3
        .select('.popup')
        .style('display', 'block')
        .style('left', (d.x0 + d.x1) / 2 + 'px')
        .style('bottom', height - d.y0 + 'px');

      popup.select('.popup--name').text(d.data.name);
      popup.select('.popup--funding').text(numeral(d.value).format('$0.0 a'));
    })
    .on('mouseout', d => {
      d3.select('.popup').style('display', 'none');
    });

  d3.select('.popup').style('display', 'none');

  if (node === root) {
    zoomed = false;
  } else {
    zoomed = true;
  }
}

function wrap(label) {
  label.each(function(d) {
    const text = d3.select(this),
      width = d.x1 - d.x0,
      words = text.text().split(/\s+/).reverse(),
      y = text.attr('y'),
      dy = parseFloat(text.attr('dy')),
      lineHeight = 1.1;

    let word,
      line = [],
      lineNumber = 0,
      tspan = text
        .text(null)
        .append('tspan')
        .attr('x', '4px')
        .attr('y', y)
        .attr('dy', lineHeight + 'em');

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text
          .append('tspan')
          .attr('x', '4px')
          .attr('y', y)
          .attr('dy', lineHeight + 'em')
          .text(word);
      }
    }
  });
}
