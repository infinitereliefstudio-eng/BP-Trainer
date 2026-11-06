/** Colours and metrics of the graph, modelled on UE5's default Blueprint editor. */
import type { NodeKind } from '@core/nodes/definition';
import type { PinCategory } from '@core/types/pins';

export const PIN_COLOR: Record<PinCategory, string> = {
  exec: '#ffffff',
  bool: '#a3161a', // maroon
  int: '#1fe0a8', // sea green
  float: '#9cf23a', // yellow-green
  string: '#ff19c8', // magenta
  vector: '#ffc81e', // gold
  rotator: '#9fb6ff', // light blue
  object: '#1aa6f2', // blue
  class: '#7a2ad4', // purple
  enum: '#0b6e5e', // dark teal
  delegate: '#ff3b3b', // event / dispatcher (red square)
  wildcard: '#808080',
};

export const HEADER_COLOR: Record<NodeKind, [string, string]> = {
  event: ['#a61c1c', '#5c0f0f'],
  function: ['#3a6ec2', '#1e3b6b'],
  latent: ['#3a6ec2', '#1e3b6b'],
  pure: ['#4f8f2c', '#284a16'],
  flow: ['#6a6a6a', '#3a3a3a'],
  entry: ['#7b3fb0', '#3f1f5c'],
  variable: ['#4a4a4a', '#2a2a2a'],
};

export const GRAPH = {
  background: '#262626',
  gridMinor: '#2f2f2f',
  gridMajor: '#1a1a1a',
  nodeBody: 'rgba(16,16,16,0.94)',
  nodeBorder: '#050505',
  selected: '#f2a516',
  error: '#ff3b30',
  pending: '#4fc3ff',
  text: '#ececec',
  textDim: '#9a9a9a',
  valueBg: '#0e0e0e',
  valueBorder: '#4a4a4a',
  rect: 'rgba(242,165,22,0.15)',
  rectBorder: '#f2a516',
};

export const METRICS = {
  font: '600 12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  labelFont: '12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  symbolFont: '700 20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headerH: 28,
  rowH: 26,
  padX: 10,
  pinR: 5,
  minW: 120,
  radius: 8,
  gridStep: 16,
};
