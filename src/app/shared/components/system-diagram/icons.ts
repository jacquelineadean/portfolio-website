import { Kind } from './system.model';

/** 12 by 12 line icons, one per kind of part, stroked in the part's ink. */
export const ICONS: Record<Kind, string> = {
  user: 'M6 6.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM1.8 11.2c.6-2.3 2.2-3.4 4.2-3.4s3.6 1.1 4.2 3.4',
  cdn: 'M6 11.2A5.2 5.2 0 1 0 6 .8a5.2 5.2 0 0 0 0 10.4zM.8 6h10.4M6 .8C7.5 2.2 8.2 3.9 8.2 6S7.5 9.8 6 11.2C4.5 9.8 3.8 8.1 3.8 6S4.5 2.2 6 .8z',
  job: 'M6 11.2A5.2 5.2 0 1 0 6 .8a5.2 5.2 0 0 0 0 10.4zM4.8 3.8v4.4L8.4 6z',
  monitor:
    'M6 .9l4.3 1.6v3.3c0 2.6-1.8 4.4-4.3 5.3C3.5 10.2 1.7 8.4 1.7 5.8V2.5zM4 6l1.5 1.5 2.7-2.8',
  client: 'M1 2h10v8H1zM1 4.4h10',
  gateway: 'M.8 6h3.4M4.2 6l3.4-3.4h3.6M4.2 6l3.4 3.4h3.6',
  db: 'M1.8 2.6C1.8 1.6 3.7.9 6 .9s4.2.7 4.2 1.7v6.8c0 1-1.9 1.7-4.2 1.7s-4.2-.7-4.2-1.7zM1.8 2.6c0 1 1.9 1.7 4.2 1.7s4.2-.7 4.2-1.7M1.8 6c0 1 1.9 1.7 4.2 1.7s4.2-.7 4.2-1.7',
  api: 'M4 1.2c-1.3 0-1.8.6-1.8 1.8v1.4c0 .9-.4 1.4-1.2 1.6.8.2 1.2.7 1.2 1.6V9c0 1.2.5 1.8 1.8 1.8M8 1.2c1.3 0 1.8.6 1.8 1.8v1.4c0 .9.4 1.4 1.2 1.6-.8.2-1.2.7-1.2 1.6V9c0 1.2-.5 1.8-1.8 1.8',
  function: 'M2.4 1.2h1.4l4.8 9.6h1.2M5.8 5.4L2.6 10.8',
  storage: 'M1 1.6h10v2.6H1zM1.8 4.2v6.2h8.4V4.2M4.5 6.4h3',
  service: 'M1.2 1.4h9.6v4H1.2zM1.2 6.6h9.6v4H1.2zM3 3.4h1.2M3 8.6h1.2',
  external: 'M3.4 9.6h5.5a2.3 2.3 0 0 0 .3-4.6A3.4 3.4 0 0 0 2.7 4.4a2.6 2.6 0 0 0 .7 5.2z',
  model: 'M6 .8l1.2 3.4 3.4 1.2-3.4 1.2L6 10 4.8 6.6 1.4 5.4l3.4-1.2z',
};

export const KIND_LABEL: Record<Kind, string> = {
  user: 'Person',
  cdn: 'Host',
  job: 'Job',
  monitor: 'Check',
  client: 'UI',
  gateway: 'Router',
  db: 'Data',
  api: 'Registry',
  function: 'Function',
  storage: 'Store',
  service: 'Service',
  external: 'Public data',
  model: 'Agent',
};
