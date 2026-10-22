/*
 * The script from the "Four Mental Models, Illustrated" artifact, run against
 * the post's shadow root instead of a whole document. Changes from the original:
 *
 * - Queries go through the shadow root, and so does the one getElementById.
 * - Window listeners, timers, animation frames and the IntersectionObserver are
 *   released by the returned teardown, because the router reuses the page.
 * - Same-page links ("#m1") scroll inside the shadow root. Left alone, they
 *   resolve against <base href> and navigate to the site root.
 * - CSS variables are read from the shadow host, where article.css defines them.
 * - The dark-theme redraw listeners are gone: the site has one theme, and the
 *   palette in article.css is dark. Hex colours below are lightened to match.
 */
export function mountArticle(root) {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => n.toLocaleString('en-US');

  /* ---------------- interview clock ---------------- */
  const ticks = $('#cf-ticks');
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, r0 = i % 3 ? 15 : 13.5;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('class', 'tick');
    l.setAttribute('x1', 20 + Math.sin(a) * r0); l.setAttribute('y1', 20 - Math.cos(a) * r0);
    l.setAttribute('x2', 20 + Math.sin(a) * 17); l.setAttribute('y2', 20 - Math.cos(a) * 17);
    ticks.appendChild(l);
  }
  const PH = [ // section id, start minute, end minute, label
    ['m1', 0, 8, 'Understand the question'],
    ['m2', 8, 18, 'Pick the building blocks'],
    ['m3', 18, 36, 'Go deeper, on purpose'],
    ['m4', 36, 45, 'Discuss, and course-correct'],
    ['coda', 45, 45, 'Debrief'],
  ];
  const phaseLinks = $$('.phases a');
  function minuteNow() {
    const y = scrollY + innerHeight * 0.35;
    const tops = PH.map(p => root.getElementById(p[0]).getBoundingClientRect().top + scrollY);
    if (y < tops[0]) return { m: null, i: -1 };
    for (let i = 0; i < 4; i++) {
      if (y < tops[i + 1]) {
        const f = (y - tops[i]) / (tops[i + 1] - tops[i]);
        return { m: PH[i][1] + f * (PH[i][2] - PH[i][1]), i };
      }
    }
    return { m: 45, i: 4 };
  }
  function arc(m) {
    if (m <= 0) return '';
    const a = Math.min(m, 59.99) / 60 * Math.PI * 2;
    const x = 20 + Math.sin(a) * 18, y = 20 - Math.cos(a) * 18;
    return `M20 20 L20 2 A18 18 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
  }
  function paintClock() {
    const { m, i } = minuteNow();
    const t = $('#ck-time'), ph = $('#ck-phase');
    if (m === null) {
      t.innerHTML = 'Before the round<small></small>'; ph.textContent = 'A 45-minute system design interview';
      $('#cf-hand').setAttribute('transform', 'rotate(0 20 20)'); $('#cf-arc').setAttribute('d', '');
    } else {
      const mm = Math.floor(m), ss = Math.floor((m - mm) * 60);
      t.innerHTML = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}<small>of 45:00</small>`;
      ph.textContent = i < 4 ? `Mental model ${i + 1} · ${PH[i][3]}` : 'Debrief · the bar-raiser observation';
      $('#cf-hand').setAttribute('transform', `rotate(${m / 60 * 360} 20 20)`);
      $('#cf-arc').setAttribute('d', arc(m));
    }
    phaseLinks.forEach((a, k) => {
      const start = PH[k][1], end = PH[k][2];
      const f = m === null ? 0 : Math.max(0, Math.min(1, (m - start) / (end - start)));
      a.querySelector('i').style.width = (f * 100) + '%';
      a.classList.toggle('on', i === k);
    });
    // hero clock follows the interview clock
    const mins = m === null ? 0 : m;
    $('#hero-min').setAttribute('transform', `rotate(${mins / 60 * 360} 588 290)`);
    $('#hero-hour').setAttribute('transform', `rotate(${300 + mins / 60 * 30} 588 290)`);
  }

  /* ---------------- phone panning for wide paintings ---------------- */
  const pans = $$('figure.plate.pan');
  function paintPans() {
    const narrow = innerWidth <= 700;
    pans.forEach(fig => {
      const st = fig.querySelector('.stage'), fr = fig.querySelector('.frame');
      if (!narrow) { st.style.transform = ''; return; }
      const r = fr.getBoundingClientRect();
      const over = st.getBoundingClientRect().width - r.width;
      if (over <= 0) { st.style.transform = ''; return; }
      const f = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)));
      const e = f < .15 ? 0 : f > .85 ? 1 : (f - .15) / .7;
      st.style.transform = `translateX(${(-over * e).toFixed(1)}px)`;
    });
  }

  /* ---------------- develop paintings when they arrive ---------------- */
  const dev = $$('.develop');
  let io = null;
  if ('IntersectionObserver' in window && !reduce) {
    io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); }
    }), { threshold: .25 });
    dev.forEach(d => io.observe(d));
  } else dev.forEach(d => d.classList.remove('pre'));
  // hero: red marker and pencil arrive in sequence
  const pops = $$('#hero-red .pop, #hero-pad .pop');
  later(() => { $('#hero-plate').classList.remove('pre'); }, 200);
  pops.forEach((p, k) => later(() => p.classList.add('in'), reduce ? 0 : 1600 + k * 380));

  function reveal() {
    $$('.develop.pre').forEach(d => { const r = d.getBoundingClientRect(); if (r.top < innerHeight * .8 && r.bottom > 0) d.classList.remove('pre'); });
  }
  let raf = 0;
  function onScroll() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paintClock(); paintPans(); reveal(); }); }
  addEventListener('scroll', onScroll, { passive: true, signal });
  addEventListener('resize', onScroll, { signal });


  /* ---------------- rubric waffle ---------------- */
  const waf = $('#waffle');
  let svg = '';
  for (let k = 0; k < 100; k++) {
    const col = k % 10, row = Math.floor(k / 10);
    const cls = k < 32 ? 'j' : k < 62 ? 'd' : 'o';
    const x = 2 + col * 21.6, y = 2 + row * 21.6;
    svg += `<rect class="${cls}" x="${x}" y="${y}" width="19" height="19" rx="2"/>`;
    if (k < 62) svg += `<line class="x" x1="${x + 3}" y1="${y + 16}" x2="${x + 16}" y2="${y + 3}"/>`;
  }
  waf.innerHTML = svg;
  function rubric(recall) {
    waf.classList.toggle('recall', recall);
    $('#rb-full').setAttribute('aria-pressed', String(!recall));
    $('#rb-recall').setAttribute('aria-pressed', String(recall));
    $('#rb-big').innerHTML = recall ? '38<small>points at most</small>' : '62<small>of 100 points grade reasoning</small>';
    $('#rb-note').textContent = recall
      ? 'If judgment and depth both score near zero, the ceiling is whatever the other 38 points allow.'
      : 'Toggle the candidate type to see what recall alone can earn.';
  }
  $('#rb-full').onclick = () => rubric(false);
  $('#rb-recall').onclick = () => rubric(true);

  /* ---------------- checklist ---------------- */
  const Q = [
    ['Who uses it, and how many of them?', 'Request rate, fan-out, and whether one region is enough.'],
    ['What is in scope, and what is out?', 'Which boxes you are allowed to leave off.'],
    ['Is it read-heavy or write-heavy?', 'Caches and replicas, or logs and partitions.'],
    ['Which latency matters, at which percentile?', 'What must stay synchronous, and where the p99 work goes.'],
    ['How fresh must reads be?', 'Strong consistency and quorums, or caches with a time to live.'],
    ['What happens when a part fails?', 'Replication factor, retries, idempotency, and what users see.'],
    ['How much data, kept for how long?', 'Storage engine, retention policy, and when to shard.'],
    ['What is fixed already?', 'Budget, existing stack, compliance and GPU supply. Build or buy follows from these.'],
  ];
  const cl = $('#checklist');
  cl.innerHTML = Q.map((q, i) => `<div class="check-item"><button type="button" aria-expanded="false"><span class="box" aria-hidden="true"></span><span>${q[0]}</span><span class="n">Q${i + 1}</span></button><div class="ans"><b>On the board, this decides:</b> ${q[1]}</div></div>`).join('');
  function countCheck() {
    const n = $$('.check-item.done', cl).length;
    $('#ck-count').textContent = n === 8 ? 'All 8 known. Draw the first box.' : `Constraints known: ${n} of 8`;
    $('#ck-bar').style.width = (n / 8 * 100) + '%';
  }
  $$('.check-item button', cl).forEach(b => b.onclick = () => {
    const it = b.parentElement; it.classList.toggle('done');
    b.setAttribute('aria-expanded', String(it.classList.contains('done'))); countCheck();
  });

  /* ---------------- consumer question ---------------- */
  const CS = {
    chat: {
      goal: 'Time to first token, then a steady stream for each person.',
      nums: 'Numbers to state: first token in about a second; 20 to 50 tokens/s per stream; concurrency from Little\u2019s law at peak.',
      drops: 'Leaves out: job queues and result files.',
      chain: [['Chat app', 'People waiting on a screen, one conversation each.'], ['API gateway', 'Streams tokens back over server-sent events.'], ['KV-aware router', 'Sends a conversation back to the GPU that already holds its prefix.'], ['Continuous batcher', 'Admits new requests between decode steps.'], ['GPU workers', 'Paged KV cache; the system prompt is shared across users.'], ['Back to the user', 'Token by token, first token within about a second.']],
    },
    eval: {
      goal: 'Tokens per GPU-hour. Nobody watches any single request.',
      nums: 'Numbers to state: total tokens per day; deadline in hours; batch as large as KV memory allows.',
      drops: 'Leaves out: streaming and per-request latency targets.',
      chain: [['Eval pipeline', 'Thousands of prompts submitted at once.'], ['Batch submit API', 'Accepts a file and returns a job id.'], ['Job queue', 'Holds work until capacity is cheap.'], ['Large continuous batches', 'Fills each GPU to its KV cache limit. No streaming.'], ['GPU workers', 'Spot or preemptible capacity, with checkpoints.'], ['Object storage', 'A results file, hours later.']],
    },
    agent: {
      goal: 'Tail latency per call, and output that always parses, because calls chain.',
      nums: 'Numbers to state: p99 per call times calls per task; share of outputs that fail to parse; length of the shared tool prefix.',
      drops: 'Leaves out: long streams to a human reader.',
      chain: [['Agent runtime', 'Many short calls in a loop.'], ['API gateway', 'JSON schema, idempotency keys and strict timeouts.'], ['Per-caller rate limiter', 'One runaway agent cannot starve the others.'], ['Continuous batcher', 'Short requests that share long prefixes.'], ['GPU workers', 'Prefix cache holds the tool definitions.'], ['Validator', 'Rejects malformed JSON before the agent sees it.']],
    },
  };
  const chain = $('#cs-chain');
  function consumer(k, first) {
    const d = CS[k];
    $$('#consumer .seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === k)));
    const render = () => {
      $('#cs-goal').innerHTML = `<span>Optimize for</span>${d.goal}`;
      chain.innerHTML = d.chain.map(n => `<div class="node${first || reduce ? '' : ' swap'}"><h4>${n[0]}</h4><p>${n[1]}</p></div>`).join('');
      $('#cs-drops').textContent = d.drops;
      $('#cs-nums').textContent = d.nums;
      if (!first && !reduce) $$('.node', chain).forEach((n, i) => later(() => n.classList.remove('swap'), 40 + i * 70));
    };
    render();
  }
  $$('#consumer .seg button').forEach(b => b.onclick = () => consumer(b.dataset.c));
  consumer('chat', true);

  /* ---------------- poke test ---------------- */
  const PK = [
    ['“p99?” on the request path.', 'They care about tail latency. Talk about the read path: caching, precomputation and timeouts.'],
    ['“It dies?” on the app server.', 'They care about availability. Talk about redundancy, health checks and what users see during failover.'],
    ['“10× writes?” on the database.', 'They care about write scale. Talk about partitioning, the shard key and the write path.'],
    ['“Who reads it?” on the client.', 'They are asking the consumer question for you. Answer it, then redraw.'],
  ];
  $$('.poke').forEach(g => {
    const go = () => {
      $$('.poke').forEach(x => x.classList.remove('on')); g.classList.add('on');
      const p = PK[+g.dataset.k];
      $('#poke-out').innerHTML = `<b>${p[0]}</b> ${p[1]}`;
    };
    g.addEventListener('click', go);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  /* ---------------- primitives ---------------- */
  const FAM = [
    ['Store', [['rel', 'Relational database', 'Rows, joins and transactions.', 'Postgres, MySQL, Aurora, Spanner', 'The data has relationships and you need multi-row transactions.'],
               ['kv', 'Key-value store', 'One key, one value, fast.', 'DynamoDB, Redis, FoundationDB', 'Every read and write names its key.'],
               ['wide', 'Wide-column store', 'Huge tables keyed by partition and sort key.', 'Cassandra, Bigtable, HBase, ScyllaDB', 'Write volume is very high and queries follow the key.'],
               ['doc', 'Document store', 'Nested records with a flexible schema.', 'MongoDB, Firestore, Couchbase', 'Records are read and written whole.'],
               ['obj', 'Object store', 'Cheap, durable blobs by name.', 'S3, Google Cloud Storage, Azure Blob', 'Files are large and immutable.']]],
    ['Find', [['btree', 'B-tree index', 'Point and range lookups with in-place updates.', 'Postgres, MySQL InnoDB', 'Reads dominate and you need ordered ranges.'],
              ['lsm', 'LSM tree', 'Write-optimized storage that compacts in the background.', 'RocksDB, Cassandra, LevelDB', 'Writes dominate and some read amplification is acceptable.'],
              ['inv', 'Inverted index', 'From each term to the documents that contain it.', 'Elasticsearch, OpenSearch, Lucene', 'Users search text.'],
              ['vec', 'Vector index', 'Approximate nearest neighbors over embeddings.', 'pgvector, FAISS, Pinecone, Milvus', 'Similarity matters more than exact match.'],
              ['geo', 'Geospatial index', 'Points and shapes by location.', 'PostGIS, S2, H3', 'Queries say near, within or inside.']]],
    ['Remember', [['cache', 'Cache', 'Keep hot reads in memory.', 'Redis, Memcached', 'The same reads repeat and slightly stale data is acceptable.'],
                  ['cdn', 'CDN', 'Serve cacheable bytes near users.', 'CloudFront, Fastly, Cloudflare', 'Many users fetch the same bytes.'],
                  ['kvc', 'KV cache', 'Attention keys and values reused across decode steps.', 'vLLM PagedAttention, TensorRT-LLM', 'You serve autoregressive models.'],
                  ['bloom', 'Bloom filter', 'Cheap “definitely not here” checks.', 'Built into RocksDB and Cassandra', 'Most lookups miss and misses are expensive.'],
                  ['mview', 'Materialized view', 'A stored answer to a known query.', 'Postgres, ClickHouse, Flink', 'The query is known ahead and runs often.']]],
    ['Move', [['mq', 'Message queue', 'Hand each job to one worker.', 'SQS, RabbitMQ', 'Work must be done once, not replayed.'],
              ['log', 'Append-only log', 'Ordered, replayable event history.', 'Kafka, Kinesis, Pulsar', 'Several consumers need the same events, now or later.'],
              ['pubsub', 'Pub/sub', 'One message to many subscribers.', 'SNS, Google Pub/Sub, NATS', 'Many systems react to one event.'],
              ['cdc', 'Change data capture', 'Turn database writes into a stream.', 'Debezium, DynamoDB Streams', 'Other systems must follow a database.'],
              ['dlq', 'Dead-letter queue', 'Park messages that keep failing.', 'SQS dead-letter queues, Kafka DLQ topics', 'A poison message must not block the rest.']]],
    ['Compute', [['svc', 'Stateless service', 'Request handlers that scale out.', 'Kubernetes, ECS, Cloud Run', 'Requests are independent.'],
                 ['batch', 'Batch processing', 'Large jobs over stored data.', 'Spark, Beam, Ray', 'Results can wait minutes or hours.'],
                 ['stream', 'Stream processing', 'Continuous computation on events.', 'Flink, Kafka Streams', 'Results must follow events within seconds.'],
                 ['wf', 'Workflow engine', 'Durable multi-step work with retries.', 'Temporal, Airflow, Step Functions', 'A process spans steps, services or days.'],
                 ['gpu', 'GPU batcher', 'Packs inference requests to keep GPUs busy.', 'vLLM, TensorRT-LLM, Triton', 'GPUs are the scarce resource.']]],
    ['Agree', [['raft', 'Consensus', 'A replicated log that nodes agree on.', 'etcd (Raft), ZooKeeper', 'A small amount of state must be correct everywhere.'],
               ['lease', 'Lease or leader election', 'One owner at a time, with expiry.', 'etcd, ZooKeeper, Consul', 'Exactly one node should act.'],
               ['lock', 'Distributed lock', 'Mutual exclusion across machines.', 'etcd, ZooKeeper', 'Two workers must never touch the same thing at once.'],
               ['idem', 'Idempotency key', 'Retries that cannot apply twice.', 'Keys stored in your own database', 'Clients retry and duplicates cost money.'],
               ['outbox', 'Outbox or saga', 'Keep a database write and a message in step.', 'Debezium outbox, Temporal', 'One action spans a database and a message.']]],
    ['Route', [['lb', 'Load balancer', 'Spread requests across healthy backends.', 'Envoy, NGINX, AWS ALB', 'There is more than one backend.'],
               ['gw', 'API gateway', 'Auth, quotas and routing at the edge.', 'Kong, Apigee, AWS API Gateway', 'Outside callers reach many services.'],
               ['rl', 'Rate limiter', 'Cap requests per caller over time.', 'Token bucket in Redis, Envoy', 'One caller can hurt the rest.'],
               ['ch', 'Consistent hashing', 'Map keys to nodes with little reshuffling.', 'Dynamo-style rings, Envoy ring hash', 'Nodes come and go and keys should stay put.'],
               ['cb', 'Circuit breaker', 'Stop calling a failing dependency.', 'Envoy, Resilience4j', 'A slow dependency can drag everything down.']]],
    ['Scale & observe', [['shard', 'Sharding', 'Split data by key across machines.', 'Citus, Vitess, native partitioning', 'One machine cannot hold or serve it all.'],
                         ['repl', 'Replication', 'Copies for durability and read scale.', 'Postgres streaming replication, Kafka ISR', 'Losing a machine must not lose data.'],
                         ['tsdb', 'Time-series store', 'Compressed metrics by time.', 'Prometheus, InfluxDB, TimescaleDB', 'You query by time window.'],
                         ['sketch', 'Probabilistic counter', 'Approximate counts in very little memory.', 'HyperLogLog, Count-Min sketch', 'An exact count is too expensive and a close one will do.'],
                         ['trace', 'Distributed tracing', 'Follow one request across services.', 'OpenTelemetry, Jaeger', 'Latency hides between services.']]],
  ];
  const PAT = [
    ['Hot reads by key', ['kv', 'cache', 'ch', 'repl', 'bloom', 'cdn']],
    ['Append, then replay', ['log', 'cdc', 'stream', 'obj', 'outbox']],
    ['Range scans by time', ['btree', 'wide', 'lsm', 'tsdb', 'shard']],
    ['Search text', ['inv', 'doc', 'cdc', 'mview']],
    ['Nearest neighbors', ['vec', 'obj', 'batch', 'cache']],
    ['One write, many readers', ['pubsub', 'mq', 'cdn', 'cache', 'mview']],
    ['Large blobs', ['obj', 'cdn', 'batch']],
    ['Multi-step, exactly once', ['wf', 'idem', 'outbox', 'dlq', 'mq']],
    ['Serve an LLM', ['gpu', 'kvc', 'rl', 'lb', 'mq', 'gw']],
  ];
  const byId = {};
  const prims = $('#prims');
  prims.innerHTML = FAM.map(([f, items]) => `<div class="fam">${f}</div>` + items.map(t => { byId[t[0]] = t; return `<button type="button" class="tile" data-id="${t[0]}"><span class="nm">${t[1]}</span><span class="vd">${t[3]}</span></button>`; }).join('')).join('');
  const pats = $('#patterns');
  pats.innerHTML = PAT.map((p, i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="false">${p[0]}</button>`).join('');
  $$('.chip', pats).forEach(c => c.onclick = () => {
    const on = c.getAttribute('aria-pressed') !== 'true';
    $$('.chip', pats).forEach(x => x.setAttribute('aria-pressed', 'false'));
    c.setAttribute('aria-pressed', String(on));
    prims.classList.toggle('filtering', on);
    const set = on ? PAT[+c.dataset.i][1] : [];
    $$('.tile', prims).forEach(t => t.classList.toggle('hit', set.includes(t.dataset.id)));
  });
  $('#show-vendors').onchange = e => prims.classList.toggle('vendors', e.target.checked);
  $$('.tile', prims).forEach(t => t.onclick = () => {
    $$('.tile', prims).forEach(x => x.classList.remove('sel')); t.classList.add('sel');
    const d = byId[t.dataset.id];
    $('#prim-detail').innerHTML = `<h4>${d[1]}</h4>${d[2]} Reach for it when ${d[4].charAt(0).toLowerCase() + d[4].slice(1)}<br><span class="vline">Vendors, chosen last: ${d[3]}</span>`;
  });

  /* ---------------- strata explorer ---------------- */
  const LAYERS = ['Role', 'Interface and data model', 'Mechanism', 'Limits and failure', 'Operations'];
  // Topsoil to bedrock, in the painting's hues, lightened to read on the dark page.
  const LCOL = ['#9cb67c', '#d4a65a', '#c9805c', '#a8897a', '#8d9abb'];
  const ST = {
    kafka: ['Kafka log', [
      'A durable, ordered event log between the ingest service and everything that consumes its events.',
      'Topics split into partitions. Producers choose a partition key. Consumer groups share partitions and track their own offsets. Retention is set per topic.',
      'Each partition is an append-only log on disk, replicated to follower brokers. A consumer reads sequentially from its offset, so replaying history is a matter of resetting that offset.',
      'Ordering is guaranteed only within a partition. A skewed key creates a hot partition that no amount of extra consumers can fix. With acks=all, writes fail once in-sync replicas fall below min.insync.replicas.',
      'Kafka does not support reducing a topic\'s partitions, and adding partitions changes which partition a key maps to. Watch consumer lag. The documentation describes a typical setup of replication factor 3 with min.insync.replicas set to 2.']],
    paged: ['PagedAttention KV cache', [
      'Holds the attention keys and values for every active sequence on the GPU, so decoding each new token does not recompute the whole prompt.',
      'Each sequence gets a block table that maps its logical blocks to physical blocks in GPU memory. The default block size in vLLM is 16 tokens.',
      'Blocks are allocated on demand, the way an operating system pages virtual memory. Sequences that share a prefix share physical blocks, and copy-on-write splits them when they diverge.',
      'The PagedAttention paper found earlier systems used only about 20 to 38 percent of KV cache memory for real token state. vLLM reports under 4 percent waste. When memory still runs out, the scheduler preempts sequences, either dropping their blocks to recompute later or swapping them to CPU memory.',
      'Watch KV cache utilization and preemption counts per GPU. The paper reports 2 to 4 times the throughput of FasterTransformer and Orca at the same latency.']],
    pg: ['Sharded Postgres', [
      'The relational store for data that is too large or too busy for a single primary.',
      'A shard key, a routing map from key to shard, and the same schema on every shard.',
      'Rows are split across primaries by hash or by range of the shard key. Each shard keeps its own replicas and fails over on its own.',
      'A skewed key creates a hot shard. Joins and transactions that cross shards become slow or need two-phase commit. Changing the shard key later means moving data while serving traffic.',
      'Plan online resharding before you need it. Run schema migrations shard by shard. Keep per-shard backups, failover drills and dashboards for the hottest shard.']],
  };
  const SG = { layers: [17.31, 28.28, 42.12, 56.78, 74.96] };
  let comp = 'kafka', lay = 0;
  const layersEl = $('#layers');
  layersEl.innerHTML = LAYERS.map((l, i) => `<button type="button" data-l="${i}" aria-pressed="${i === 0}"><i style="background:${LCOL[i]}">${i + 1}</i><span>${l}</span></button>`).join('');
  function strata() {
    const d = ST[comp];
    $$('button', layersEl).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.l === lay)));
    $$('#strata-comp button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === comp)));
    $('#lc-k').textContent = `Layer ${lay + 1} of 5 · ${LAYERS[lay]}`;
    $('#lc-h').textContent = d[0];
    $('#lc-p').textContent = d[1][lay];
    const bottom = lay < 4 ? (SG.layers[lay] + SG.layers[lay + 1]) / 2 : 88;
    $('#probe').style.height = (bottom - 15) + '%';
  }
  $$('button', layersEl).forEach(b => b.onclick = () => { lay = +b.dataset.l; strata(); });
  $$('#strata-comp button').forEach(b => b.onclick = () => { comp = b.dataset.k; strata(); });
  strata();

  /* ---------------- depth budget venn ---------------- */
  // region anchor points in % of the painting (1500 x 1320)
  const RG = {
    L: [24.5, 36], N: [75.5, 36], T: [50, 86],
    LN: [50, 30], LT: [38, 63], NT: [62, 63], LNT: [50, 53.5],
  };
  const VC = [
    ['router', 'KV-aware router', 'LN', 'inference', 'Decides which GPU holds a conversation. Getting it wrong multiplies prefill work, and few systems outside LLM serving need one.'],
    ['batcher', 'GPU batcher', 'LN', 'inference', 'Sets throughput and latency for the whole service. Continuous batching is specific to autoregressive models.'],
    ['kvmem', 'KV cache memory', 'LN', 'inference', 'Memory per sequence caps concurrency. Paging it is the newest idea on the board.'],
    ['weights', 'Model weight loading', 'N', 'inference', 'Cold starts for very large weights are rare in other systems. They matter only during scale-up.'],
    ['rl', 'Per-org rate limiter', 'L', 'api', 'Protects every other customer from one heavy caller. The algorithm itself is standard.'],
    ['sse', 'Token streaming', 'L', 'api', 'Chat feels slow without it. Server-sent events are well understood.'],
    ['gw', 'Gateway and auth', '', 'api', 'Necessary, standard and rarely where the hard decisions are.'],
    ['conv', 'Conversation store', 'L', 'storage', 'Every request reads history from it. A sharded key-value design is familiar.'],
    ['usage', 'Usage log for billing', 'L', 'storage', 'Money depends on it being complete. An append-only log handles it.'],
    ['cdn', 'CDN for the web app', '', '', 'Commodity. One sentence and move on.'],
  ];
  const venn = $('#venn');
  VC.forEach((c, n) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'vdot'; b.dataset.id = c[0]; b.innerHTML = `<i>${n + 1}</i><span>${c[1]}</span>`; b.setAttribute('aria-label', c[1]); venn.appendChild(b); });
  let team = 'inference';
  function placeVenn() {
    $$('#team button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === team)));
    const groups = {}, lot = [];
    VC.forEach(c => {
      let key = c[2] + (c[3] === team ? 'T' : '');
      key = ['L', 'N', 'T', 'LN', 'LT', 'NT', 'LNT'].includes(key) ? key : (key === 'LNT' ? 'LNT' : key);
      const el = $(`.vdot[data-id="${c[0]}"]`, venn);
      if (!key) { el.hidden = true; lot.push(c[1]); return; }
      el.hidden = false;
      (groups[key] = groups[key] || []).push(el);
      el.classList.toggle('core', key === 'LNT');
    });
    const narrow = innerWidth <= 820;
    Object.entries(groups).forEach(([k, els]) => {
      const [x, y] = RG[k];
      els.forEach((el, i) => {
        const off = i - (els.length - 1) / 2;
        el.style.left = (narrow ? x + off * 7.2 : x) + '%';
        el.style.top = (narrow ? y : y + off * 5.6) + '%';
      });
    });
    const where = c => { const p = []; if (c[2].includes('L')) p.push('load-bearing'); if (c[2].includes('N')) p.push('novel'); if (c[3] === team) p.push("interviewer's team"); return p.length ? p.join(' + ') : 'outside the circles'; };
    $('#venn-list').innerHTML = VC.map((c, n) => `<li><button type="button" data-id="${c[0]}"><b>${n + 1}</b><span>${c[1]}<small>${where(c)}</small></span></button></li>`).join('');
    $$('#venn-list button').forEach(b => b.onclick = () => $(`.vdot[data-id="${b.dataset.id}"]`, venn).click());
    const cores = VC.filter(c => c[2] === 'LN' && c[3] === team).map(c => c[1]);
    $('#venn-lot').innerHTML = (cores.length
      ? `<b>Deep dive:</b> ${cores.join(', ')}. `
      : `<b>Nothing lands in all three circles for this team.</b> Spend the depth where two overlap, starting with what the interviewer's team owns. `)
      + (lot.length ? `<b>Outside every circle:</b> ${lot.join(', ')}. Name them in one sentence each.` : '');
  }
  $$('#team button').forEach(b => b.onclick = () => { team = b.dataset.t; placeVenn(); });
  addEventListener('resize', placeVenn, { signal });
  venn.addEventListener('click', e => {
    const b = e.target.closest('.vdot'); if (!b) return;
    $$('.vdot', venn).forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    const c = VC.find(v => v[0] === b.dataset.id);
    const parts = [];
    if (c[2].includes('L')) parts.push('load-bearing'); if (c[2].includes('N')) parts.push('novel'); if (c[3] === team) parts.push("on the interviewer's team");
    $('#venn-card').innerHTML = `<div class="lk" style="color:var(--red-text)">${parts.length === 3 ? 'All three: deep dive' : parts.length ? parts.join(' + ') : 'Outside the circles'}</div><h4>${c[1]}</h4><p>${c[4]}</p>`;
  });
  placeVenn();

  /* ---------------- breadth toy model ---------------- */
  const toy = $('#toy-svg');
  function toyModel() {
    const n = +$('#toy-n').value; $('#toy-n-out').textContent = n;
    const rem = Math.max(0, 30 - 1.5 * n), each = rem / 2;
    const deep = Math.min(5, 1 + Math.floor(each / 3));
    const bw = 560 / 20, base = 190, lh = 30;
    let s = `<line x1="20" y1="${base}" x2="590" y2="${base}" stroke="var(--rule)" stroke-width="2"/>`;
    for (let l = 1; l <= 5; l++) s += `<text x="12" y="${base - (l - .5) * lh + 4}" text-anchor="end" style="font:500 11px var(--f-ui);fill:var(--muted)">L${l}</text><line x1="20" y1="${base - l * lh}" x2="590" y2="${base - l * lh}" stroke="var(--rule-2)"/>`;
    for (let i = 0; i < n; i++) {
      const x = 26 + i * bw, layers = i < 2 ? deep : 1;
      for (let l = 0; l < layers; l++) s += `<rect x="${x}" y="${base - (l + 1) * lh + 2}" width="${bw - 6}" height="${lh - 4}" rx="2" fill="${LCOL[l]}" opacity="${i < 2 ? 1 : .55}"/>`;
    }
    toy.innerHTML = s;
    $('#toy-out').innerHTML = rem <= 0
      ? `With <b>${n}</b> components there is no time left for a deep dive. Every component stays at layer 1.`
      : `With <b>${n}</b> components named, each of the two deep dives gets <b>${each.toFixed(1)}</b> minutes. That reaches layer <b>${deep}</b> of 5.`;
  }
  $('#toy-n').addEventListener('input', toyModel); toyModel();

  /* ---------------- six signals ---------------- */
  const SIG = [
    [39.56, 11.91, '“What about X?”', 'X is on their rubric. Go there now, even if it means leaving a sentence unfinished.'],
    [65.5, 11.83, 'They restate a requirement', 'Your design breaks it somewhere. Stop and check before you add anything.'],
    [16.81, 29.47, 'They hand you a number', 'They want an estimate built on it. Do the arithmetic out loud and use the result.'],
    [39.31, 44.59, '“Why this over that?”', 'A tradeoff check. Name what your choice gives up, and when you would switch.'],
    [77.0, 52.51, 'The pen stops moving', 'You are spending time on something they are not scoring. Ask whether to continue.'],
    [65.69, 68.42, '“In the interest of time…”', 'Move to the next phase now, and say out loud what you are skipping.'],
  ];
  const panel = $('#panel'), sl = $('#sig-list');
  SIG.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hot'; b.style.left = s[0] + '%'; b.style.top = s[1] + '%';
    b.textContent = i + 1; b.setAttribute('aria-label', `Signal ${i + 1}: ${s[2]}`); b.onclick = () => sig(i); panel.appendChild(b);
  });
  sl.innerHTML = SIG.map((s, i) => `<li><button type="button" data-i="${i}">${i + 1}. ${s[2]}</button></li>`).join('');
  $$('button', sl).forEach(b => b.onclick = () => sig(+b.dataset.i));
  function sig(i) {
    $$('.hot', panel).forEach((h, k) => h.classList.toggle('on', k === i));
    $$('button', sl).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    $('#sg-k').textContent = `Signal ${i + 1} of 6`; $('#sg-h').textContent = SIG[i][2]; $('#sg-p').textContent = SIG[i][3];
  }
  sig(0);

  /* ---------------- three-second game ---------------- */
  const GM = [
    ['You have spent four minutes on load-balancing algorithms. The interviewer has stopped writing.', 'r', 'The pen stopped. This topic is not on their rubric.'],
    ['You explain hash versus range sharding. The interviewer nods and asks which key you would choose.', 'k', 'A follow-up inside your topic is a green light.'],
    ['The interviewer says, for the second time, that the workload is read-heavy.', 'r', 'A repeated requirement means the design has drifted away from it.'],
    ['You are deriving storage for five years of logs. The interviewer says a ballpark is fine.', 'r', 'They are telling you the precision is not worth the minutes.'],
    ['You name a queue. The interviewer asks why you did not choose a log.', 'k', 'Stay and answer with the tradeoff. That exchange is what they came for.'],
    ['The interviewer leans in and asks what happens when the leader fails.', 'k', 'They picked this direction. Go deeper on it.'],
  ];
  let gi = -1, score = 0, timer = 0, t0 = 0;
  const ring = $('#gm-ring');
  function tick() {
    const left = Math.max(0, 3 - (performance.now() - t0) / 1000);
    $('#gm-sec').textContent = Math.ceil(left);
    ring.style.strokeDashoffset = String(145 * (1 - left / 3));
    if (left <= 0) answer(null); else timer = requestAnimationFrame(tick);
  }
  function card() {
    gi++;
    if (gi >= GM.length) {
      $('#gm-count').textContent = 'Done';
      $('#gm-text').textContent = `You matched ${score} of 6 within three seconds.`;
      $('#gm-btns').innerHTML = '<button class="btn primary" type="button" id="gm-again">Play again</button>';
      $('#gm-again').onclick = start; $('#gm-verdict').textContent = '';
      return;
    }
    $('#gm-count').textContent = `Reaction ${gi + 1} of 6`;
    $('#gm-text').textContent = GM[gi][0];
    $('#gm-verdict').textContent = '';
    $('#gm-btns').innerHTML = '<button class="btn primary" type="button" data-a="k">Keep going</button><button class="btn" type="button" data-a="r">Re-anchor</button>';
    $$('#gm-btns button').forEach(b => b.onclick = () => answer(b.dataset.a));
    t0 = performance.now(); cancelAnimationFrame(timer); timer = requestAnimationFrame(tick);
  }
  function answer(a) {
    cancelAnimationFrame(timer);
    const g = GM[gi], ok = a === g[1];
    if (ok) score++;
    const right = g[1] === 'k' ? 'Keep going' : 'Re-anchor';
    $('#gm-verdict').innerHTML = (a === null ? `<b class="no">Time.</b> ` : ok ? `<b class="ok">Right.</b> ` : `<b class="no">Not quite.</b> `) + `${right}. ${g[2]}`;
    $('#gm-btns').innerHTML = '<button class="btn primary" type="button" id="gm-next">Next</button>';
    $('#gm-next').onclick = card; $('#gm-next').focus({ preventScroll: true });
  }
  function start() { gi = -1; score = 0; card(); }
  $('#gm-start').onclick = start;

  /* ---------------- escape hatches ---------------- */
  const HT = [
    ['Re-anchor', 'Let me step back to the requirements. I think I optimized for the wrong one.', 'The interviewer restates a requirement, or your design no longer serves it.'],
    ['Fork', 'There are two reasonable options. I will take A because of X, and switch to B if X changes.', 'You are stuck between two designs and the clock is running.'],
    ['Unknown internals', 'I have not run this in production. Here is how I would reason about it from first principles.', 'You are asked about a system you only know from the outside.'],
    ['Ask for direction', 'I can go deeper on the write path or on failure recovery. Which is more useful to you?', 'Two paths look equally valuable, or the interviewer has gone quiet.'],
    ['Timebox', 'I will spend two more minutes here, then move on to failure modes.', 'You are deep in a detail and unsure it is worth the time.'],
  ];
  $('#hatches').innerHTML = HT.map((h, i) => `<div class="hatch index-card"><p class="tag">${i + 1} · ${h[0]}</p><p class="say">“${h[1]}”</p><p class="when">Use when: ${h[2]}</p><button class="btn copy" type="button" data-i="${i}">Copy phrase</button></div>`).join('');
  function copyText(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = 'Copied'; later(() => btn.textContent = o, 1400); };
    const fall = () => {
      const sel = getSelection(), rng = document.createRange();
      const say = btn.parentElement.querySelector('.say') || btn.closest('figure');
      rng.selectNodeContents(say); sel.removeAllRanges(); sel.addRange(rng);
      btn.textContent = 'Selected: copy it';
    };
    try { navigator.clipboard.writeText(text).then(done, fall); } catch (e) { fall(); }
  }
  $$('#hatches .copy').forEach(b => b.onclick = () => copyText(HT[+b.dataset.i][1], b));

  /* ---------------- closing builder ---------------- */
  const CL = [
    ['The requirement I designed for', 'Interactive chat, so time to first token was the target.', '[The requirement that drove the design, and its number.]'],
    ['The two tradeoffs I made', 'Paged KV cache over static reservation: more concurrent users, at the cost of preemption under memory pressure. Continuous batching over static batches: lower latency, more scheduler work.', '[Choice A over B: what it bought, what it cost. Twice.]'],
    ['The biggest risk, and how I would see it', 'One popular prefix overloading a single GPU pool. I would watch per-pool KV cache use and queue time.', '[The failure most likely to hurt, and the metric that shows it first.]'],
    ['What I would build next', 'Prefix-aware autoscaling, then a cheaper batch tier for evaluation traffic.', '[The next two things, in order.]'],
  ];
  $('#close-steps').innerHTML = CL.map((c, i) => `<div class="cstep${i === 0 ? ' on' : ''}"><span class="num">${i + 1}</span><div><h4>${c[0]}</h4><p>${c[1]}</p></div></div>`).join('');
  let cs = 0;
  $('#close-next').onclick = () => {
    cs = cs < CL.length - 1 ? cs + 1 : 0;
    $$('.cstep').forEach((s, i) => s.classList.toggle('on', i <= cs));
    $('#close-next').textContent = cs === CL.length - 1 ? 'Start over' : 'Next line';
  };
  $('#close-copy').onclick = e => copyText(CL.map((c, i) => `${i + 1}. ${c[0]}: ${c[2]}`).join('\n'), e.currentTarget);


  /* ================= deep dives: shared helpers ================= */
  const enc = new TextEncoder();
  // Kafka's murmur2 (clients/.../utils/Utils.java), checked against Kafka's own test vectors
  function murmur2(str) {
    const d = enc.encode(str), len = d.length, m = 0x5bd1e995, r = 24;
    let h = (0x9747b28c ^ len) | 0;
    const l4 = len >> 2;
    for (let i = 0; i < l4; i++) {
      const i4 = i * 4;
      let k = (d[i4] & 0xff) | ((d[i4 + 1] & 0xff) << 8) | ((d[i4 + 2] & 0xff) << 16) | ((d[i4 + 3] & 0xff) << 24);
      k = Math.imul(k, m); k ^= k >>> r; k = Math.imul(k, m);
      h = Math.imul(h, m); h ^= k;
    }
    const t = len & ~3;
    switch (len & 3) {
      case 3: h ^= (d[t + 2] & 0xff) << 16; // falls through
      case 2: h ^= (d[t + 1] & 0xff) << 8; // falls through
      case 1: h ^= d[t] & 0xff; h = Math.imul(h, m);
    }
    h ^= h >>> 13; h = Math.imul(h, m); h ^= h >>> 15;
    return h | 0;
  }
  const toPos = h => h & 0x7fffffff;
  const GiB = 2 ** 30, MiB = 2 ** 20;
  const fmtB = b => b >= GiB ? (b / GiB).toFixed(b >= 100 * GiB ? 0 : 1) + ' GiB' : b >= MiB ? (b / MiB).toFixed(b >= 100 * MiB ? 0 : 1) + ' MiB' : Math.round(b / 1024) + ' KiB';
  const fN = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  const cssv = v => getComputedStyle(root.host).getPropertyValue(v).trim();
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const MODELS = {
    l8: { name: 'Llama 3 8B', params: 8.03e9, layers: 32, kvh: 8, hd: 128 },
    l13: { name: 'Llama 2 13B', params: 13.0e9, layers: 40, kvh: 40, hd: 128 },
    l70: { name: 'Llama 3 70B', params: 70.6e9, layers: 80, kvh: 8, hd: 128 },
  };
  Object.values(MODELS).forEach(m => { m.kv = 2 * m.layers * m.kvh * m.hd * 2; m.w = m.params * 2; });
  const GPUS = {
    h100: { name: 'H100 SXM', mem: 80 * GiB, bw: 3.35e12, fl: 989e12 },
    a100: { name: 'A100 SXM', mem: 80 * GiB, bw: 2.039e12, fl: 312e12 },
  };
  const EFF = { mem: 0.9, bw: 0.8, fl: 0.5 };
  function serving(model, gpu, ctx) {
    let tp = 1;
    while (model.w / tp > 0.5 * EFF.mem * gpu.mem && tp < 8) tp *= 2;
    const kvCap = tp * EFF.mem * gpu.mem - model.w;
    const perSeq = ctx * model.kv;
    const bMem = Math.max(0, Math.floor(kvCap / perSeq));
    const memT = B => (model.w + B * perSeq) / (tp * gpu.bw * EFF.bw);
    const flT = B => 2 * model.params * B / (tp * gpu.fl * EFF.fl);
    const step = B => Math.max(memT(B), flT(B));
    return { tp, kvCap, perSeq, bMem, step, memT, flT };
  }

  /* ---------------- capacity estimator ---------------- */
  const DAU = [1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7];
  const PIN = [100, 250, 500, 1000, 2000, 4000, 8000];
  const POUT = [50, 100, 200, 300, 500, 1000, 2000];
  const short = n => n >= 1e6 ? (n / 1e6) + 'M' : n >= 1e3 ? (n / 1e3) + 'k' : String(n);
  const GPU_GEO = [[11.67, 16.92, 26.67, 40.0], [32.5, 16.92, 47.5, 40.0], [53.33, 16.92, 68.33, 40.0], [74.17, 16.92, 89.17, 40.0], [11.67, 61.54, 26.67, 84.62], [32.5, 61.54, 47.5, 84.62], [53.33, 61.54, 68.33, 84.62], [74.17, 61.54, 89.17, 84.62]]
    .map(([a, b, c, d]) => [a * 24, b * 13, c * 24, d * 13]);
  function estimate() {
    const model = MODELS[$('#e-model').value], gpu = GPUS[$('#e-gpu').value];
    const dau = DAU[+$('#e-dau').value], rpd = +$('#e-rpd').value, pk = +$('#e-peak').value;
    const pin = PIN[+$('#e-in').value], pout = POUT[+$('#e-out').value], spd = +$('#e-spd').value;
    $('#e-dau-o').textContent = short(dau); $('#e-rpd-o').textContent = rpd; $('#e-peak-o').textContent = pk + '×';
    $('#e-in-o').textContent = fN(pin); $('#e-out-o').textContent = fN(pout); $('#e-spd-o').textContent = spd;
    const avg = dau * rpd / 86400, peak = avg * pk;
    const ctx = pin + pout / 2;
    const s = serving(model, gpu, ctx);
    const prefill = 2 * model.params * pin / (s.tp * gpu.fl * EFF.fl);
    const Wt = prefill + pout / spd;
    const C = peak * Wt;
    const bBw = Math.floor((s.tp * gpu.bw * EFF.bw / spd - model.w) / s.perSeq);
    const bFl = Math.floor(s.tp * gpu.fl * EFF.fl / spd / (2 * model.params));
    const bSpeed = Math.min(bBw, bFl);
    const B = Math.min(s.bMem, bSpeed);
    const ok = B >= 1;
    const limiter = !ok ? '' : B === s.bMem ? 'KV cache memory' : bBw <= bFl ? 'memory bandwidth at this speed' : 'compute at this speed';
    const replicas = ok ? Math.ceil(C / B) : 0, gpus = replicas * s.tp, nodes = Math.ceil(gpus / 8);
    const stepAt = ok ? s.step(B) : 0;
    const warn = $('#e-warn');
    if (!ok) {
      warn.hidden = false;
      warn.textContent = s.bMem < 1
        ? `One stream's KV cache (${fmtB(s.perSeq)}) does not fit next to the weights. Shorten the context or choose a larger setup.`
        : `${gpu.name} cannot reach ${spd} tokens/s per stream on ${model.name} with this context, even at batch 1. Lower the speed target.`;
    } else warn.hidden = true;
    const T = (v, l, c = '') => `<div class="tile2 ${c}"><b>${v}</b><span>${l}</span></div>`;
    $('#e-tiles').innerHTML = [
      T(fN(peak), 'requests per second at peak', 'b'),
      T(fN(C), 'streams in flight (Little’s law)', 'b'),
      T(fmtB(s.perSeq), 'KV cache per stream', 'g'),
      T(ok ? fN(B) : 'n/a', ok ? `streams per replica, limited by ${limiter}` : 'streams per replica', 'g'),
      T(ok ? fN(gpus) : 'n/a', ok ? `GPUs (${fN(replicas)} replica${replicas === 1 ? '' : 's'} × ${s.tp})` : 'GPUs', 'r'),
      T(ok ? fN(nodes) : 'n/a', '8-GPU servers', 'r'),
    ].join('');
    const L = [];
    L.push(`<b>Peak rate</b> <code>${fN(dau)} users × ${rpd} requests ÷ 86,400 s × ${pk} = ${fN(peak)} requests/s</code>`);
    L.push(`<b>Time in system</b> <code>prefill ${(prefill * 1000).toFixed(0)} ms + ${fN(pout)} tokens ÷ ${spd} tokens/s = ${Wt.toFixed(1)} s</code>`);
    L.push(`<b>Little’s law</b> <code>L = λW = ${fN(peak)} × ${Wt.toFixed(1)} = ${fN(C)} streams</code>`);
    L.push(`<b>KV per token</b> <code>2 × ${model.layers} layers × ${model.kvh} KV heads × ${model.hd} × 2 bytes = ${fmtB(model.kv)}</code>`);
    L.push(`<b>KV per stream</b> <code>(${fN(pin)} + ${fN(pout)} ÷ 2) tokens × ${fmtB(model.kv)} = ${fmtB(s.perSeq)}</code>`);
    L.push(`<b>One replica</b> <code>${fmtB(model.w)} of weights on ${s.tp} GPU${s.tp > 1 ? 's' : ''}; KV room = ${s.tp} × ${fmtB(EFF.mem * gpu.mem)} − ${fmtB(model.w)} = ${fmtB(s.kvCap)}</code>`);
    L.push(`<b>Streams per replica</b> <code>min(${fN(s.bMem)} by memory, ${fN(Math.max(0, bSpeed))} by speed) = ${ok ? fN(B) : 'none'}</code>`);
    if (ok) {
      L.push(`<b>Decode step</b> <code>max(memory: (${fmtB(model.w)} + ${fN(B)} × ${fmtB(s.perSeq)}) ÷ (${s.tp} × ${(gpu.bw * EFF.bw / 1e12).toFixed(2)} TB/s) = ${(s.memT(B) * 1000).toFixed(1)} ms, compute: 2 × ${(model.params / 1e9).toFixed(1)}B params × ${fN(B)} ÷ (${s.tp} × ${(gpu.fl * EFF.fl / 1e12).toFixed(0)} TFLOPS) = ${(s.flT(B) * 1000).toFixed(1)} ms) = ${(stepAt * 1000).toFixed(1)} ms, so ${(1 / stepAt).toFixed(0)} tokens/s per stream</code>`);
      L.push(`<b>Fleet</b> <code>⌈${fN(C)} ÷ ${fN(B)}⌉ = ${fN(replicas)} replicas × ${s.tp} = ${fN(gpus)} GPUs on ${fN(nodes)} server${nodes === 1 ? '' : 's'}</code>`);
    }
    $('#e-math').innerHTML = L.map(x => `<li>${x}</li>`).join('');
    // overlay: one server at peak
    const ov = $('#gpu-ov');
    const used = ok ? Math.min(8, gpus) : 0;
    const wPer = model.w / s.tp, kvPer = ok ? B * s.perSeq / s.tp : 0;
    let o = '';
    GPU_GEO.forEach(([x0, y0, x1, y1], g) => {
      const h = y1 - y0;
      if (g < used) {
        const hw = h * Math.min(1, wPer / gpu.mem), hk = h * Math.min(1, kvPer / gpu.mem);
        o += `<rect class="w" x="${x0}" y="${y1 - hw}" width="${x1 - x0}" height="${hw}"/>`;
        o += `<rect class="kv" x="${x0}" y="${y1 - hw - hk}" width="${x1 - x0}" height="${hk}"/>`;
        o += `<text class="gl dim" x="${x0 + 16}" y="${y0 + 40}">GPU ${g + 1}</text>`;
        if (hw > 40) o += `<text class="gm" x="${x0 + 16}" y="${y1 - 14}">weights ${fmtB(wPer)}</text>`;
        if (hk > 40) o += `<text class="gm" x="${x0 + 16}" y="${y1 - hw - 14}">KV ${fmtB(kvPer)}</text>`;
      } else {
        o += `<rect class="idle" x="${x0}" y="${y0}" width="${x1 - x0}" height="${h}"/><text class="gl dim" x="${x0 + 16}" y="${y0 + 40}">idle</text>`;
      }
    });
    if (ok && s.tp > 1) {
      for (let r0 = 0; r0 < used; r0 += s.tp) {
        const grp = GPU_GEO.slice(r0, Math.min(used, r0 + s.tp));
        const xs = grp.flatMap(gq => [gq[0], gq[2]]), ys = grp.flatMap(gq => [gq[1], gq[3]]);
        const bx0 = Math.min(...xs) - 50, by0 = Math.min(...ys) - 70, bx1 = Math.max(...xs) + 50, by1 = Math.max(...ys) + 40;
        o += `<rect class="rep" x="${bx0}" y="${by0}" width="${bx1 - bx0}" height="${by1 - by0}" rx="18"/><text class="rl" x="${bx0 + 24}" y="${by1 - 12}">replica ${r0 / s.tp + 1}</text>`;
      }
    }
    o += `<text class="nl" x="120" y="62">${ok ? (nodes > 1 ? `Server 1 of ${fN(nodes)} at peak` : 'The whole fleet at peak') : 'Not reachable'}${ok && s.tp === 1 ? ' · one replica per GPU' : ''}</text>`;
    ov.innerHTML = o;
  }
  ['#e-model', '#e-gpu', '#e-dau', '#e-rpd', '#e-peak', '#e-in', '#e-out', '#e-spd'].forEach(id => $(id).addEventListener('input', estimate));
  estimate();

  /* ---------------- latency ladder ---------------- */
  const LAD = [
    [0.5e-9, 'L1 cache reference', 'CPU cache hit', 'mem'],
    [100e-9, 'Main memory reference', 'in-process cache or hash map', 'mem'],
    [150e-6, 'Read 4 KB at random from SSD', 'key-value read that misses RAM', 'disk'],
    [250e-6, 'Read 1 MB sequentially from memory', 'scan a cached result set', 'mem'],
    [500e-6, 'Round trip within one datacenter', 'network cache hit, same-zone RPC', 'net'],
    [1e-3, 'Read 1 MB sequentially from SSD', 'scan a log segment or SSTable', 'disk'],
    [10e-3, 'Disk seek', 'random read on a spinning disk', 'disk'],
    [20e-3, 'Read 1 MB sequentially from disk', 'sequential log on a spinning disk', 'disk'],
    [150e-3, 'California to Netherlands and back', 'synchronous cross-region replication', 'net'],
  ];
  const fmtT = s => s < 1e-6 ? +(s * 1e9).toFixed(1) + ' ns' : s < 1e-3 ? +(s * 1e6).toFixed(0) + ' µs' : s < 1 ? +(s * 1e3).toFixed(0) + ' ms' : s.toFixed(0) + ' s';
  function fmtHuman(sec) {
    const u = [[3.156e7, 'years'], [2.63e6, 'months'], [86400, 'days'], [3600, 'hours'], [60, 'min'], [1, 's']];
    for (const [d, n] of u) if (sec >= d) { const v = sec / d; return (v < 10 ? v.toFixed(1) : v.toFixed(0)) + ' ' + n; }
    return sec.toFixed(1) + ' s';
  }
  function ladder() {
    const human = $('#ladder-human').checked, svg = $('#ladder');
    const narrow = (svg.clientWidth || innerWidth) < 560;
    const W = narrow ? 380 : 760, x0 = narrow ? 0 : 250, x1 = narrow ? 372 : 740, rowH = narrow ? 64 : 39.5, top = narrow ? 34 : 40;
    const H = top + LAD.length * rowH + 4;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const lo = -10, hi = 0;
    const X = v => x0 + (Math.log10(v) - lo) / (hi - lo) * (x1 - x0);
    let s = '';
    [[1e-9, '1 ns'], [1e-6, '1 µs'], [1e-3, '1 ms'], [1, '1 s']].forEach(([v, l]) => {
      const x = X(v), anchor = v === 1 && narrow ? 'end' : 'middle';
      s += `<g class="tick"><line x1="${x}" y1="22" x2="${x}" y2="${H}"/><text x="${x}" y="14" text-anchor="${anchor}">${human ? fmtHuman(v * 1e9) : l}</text></g>`;
    });
    LAD.forEach(([v, l, use, k], i) => {
      const y = top + i * rowH, xe = X(v);
      const val = human ? fmtHuman(v * 1e9) : fmtT(v);
      if (narrow) {
        s += `<text class="lab" x="0" y="${y + 12}">${l}</text>`;
        s += `<rect class="bar ${k}" x="0" y="${y + 19}" width="${Math.max(2, xe)}" height="13" rx="2"/>`;
        const right = xe + 70 > W;
        s += `<text class="val" x="${right ? xe - 6 : xe + 6}" y="${y + 30}" text-anchor="${right ? 'end' : 'start'}"${right ? ' style="fill:var(--paper)"' : ''}>${val}</text>`;
        s += `<text class="use" x="0" y="${y + 50}">${use}</text>`;
      } else {
        s += `<text class="lab" x="${x0 - 12}" y="${y + 12}" text-anchor="end">${l}</text>`;
        s += `<rect class="bar ${k}" x="${x0}" y="${y}" width="${Math.max(2, xe - x0)}" height="15" rx="2"/>`;
        const right = xe + 8 + 70 > W;
        s += `<text class="val" x="${right ? xe - 6 : xe + 8}" y="${y + 12}" text-anchor="${right ? 'end' : 'start'}"${right ? ' style="fill:var(--paper)"' : ''}>${val}</text>`;
        s += `<text class="use" x="${x0}" y="${y + 31}">${use}</text>`;
      }
    });
    svg.innerHTML = s;
  }
  addEventListener('resize', ladder, { signal });
  $('#ladder-human').addEventListener('change', ladder);
  ladder();

  /* ---------------- tradeoff pairs ---------------- */
  const PAIRS = [
    ['B-tree or LSM tree',
      ['B-tree', 'A lookup reads about log base fanout of the row count pages: 3 or 4 even at billions of rows. Rows update in place.', 'Random writes. Changing one row rewrites a whole page plus the write-ahead log, so small writes are amplified.', 'Read-heavy tables, range queries, transactions. Postgres, MySQL InnoDB.'],
      ['LSM tree', 'Writes land in an in-memory table and an append-only log, then flush as sorted files. Ingest stays sequential.', 'Reads may check several levels; Bloom filters skip most misses. Compaction rewrites data in the background and spends disk bandwidth.', 'Write-heavy ingest, time series, huge key spaces. RocksDB, Cassandra.'],
      'With a fanout of 500, a B-tree reaches 125 million rows in 3 levels and 62.5 billion in 4.'],
    ['Queue or log',
      ['Queue', 'Each message goes to one worker and is deleted on acknowledgement. Per-message retries, delays and dead-letter queues.', 'No replay. A second consumer needs its own copy. Ordering is usually best effort.', 'Work that must happen once: emails, thumbnails, payouts. SQS, RabbitMQ.'],
      ['Append-only log', 'Messages stay for the retention period. Each consumer group keeps its own offset, so a new reader can replay history. Order holds within a partition.', 'A classic consumer group runs at most one consumer per partition. A slow message holds up its whole partition.', 'Several systems need the same events, or you need replay. Kafka, Kinesis, Pulsar.'],
      'In a classic Kafka consumer group each partition has one reader, so 12 partitions cap the group at 12 busy consumers.'],
    ['Cache-aside or write-through',
      ['Cache-aside', 'The app reads the cache, and on a miss reads the database and fills the cache. Only requested data gets cached.', 'Reads can be stale until a time-to-live expires or the key is invalidated. A cold cache sends every read to the database.', 'Read-heavy data that tolerates seconds of staleness. Profiles, catalogs.'],
      ['Write-through', 'Every write updates the cache and the database together, so reads see fresh data.', 'Each write pays two writes. The cache fills with data that may never be read.', 'Read-after-write matters and the write rate is modest. Sessions, settings.'],
      'At a 95% hit rate the database sees 1 read in 20. Drop to 90% and its read load doubles.'],
    ['Synchronous or asynchronous replication',
      ['Synchronous', 'A commit returns only after a replica has it. Failover loses no acknowledged write.', 'Every commit waits one more round trip. If the replica is down, writes stall unless a policy relaxes the rule.', 'Money, inventory, anything where a lost write is a bug.'],
      ['Asynchronous', 'A commit returns after the local write. Write latency stays flat, even across regions.', 'Replicas lag. A failover can lose the writes that had not shipped yet.', 'Read replicas, analytics, cross-region copies where a few seconds of loss is acceptable.'],
      'In one datacenter, sync adds about 0.5 ms per commit. California to the Netherlands adds about 150 ms: fewer than 7 strictly serial commits per second.'],
    ['Hash or range sharding',
      ['Hash', 'Keys spread evenly. Sequential keys such as timestamps do not pile onto one shard.', 'A range query must ask every shard. Related rows land apart unless they share a shard key.', 'Lookups by ID, write-heavy tables with ever-increasing keys.'],
      ['Range', 'A range scan hits one shard or a few. Splitting a hot range is simple.', 'New keys at the end of the range all hit the last shard. Popular ranges become hot shards.', 'Scans by time or prefix, ordered pagination.'],
      'A range query on a hash-sharded table fans out to all N shards, so it waits for the slowest of N responses.'],
    ['Static or continuous batching',
      ['Static batching', 'Simple. The batch forms once and runs until its longest request finishes.', 'Short requests wait for long ones. Finished slots sit idle, and new requests wait for the next batch.', 'Offline jobs with uniform lengths.'],
      ['Continuous batching', 'Requests join and leave between decode steps, so the batch stays full. Orca called this iteration-level scheduling.', 'A more complex scheduler, plus memory management per step, such as paged KV blocks.', 'Online serving with mixed lengths. vLLM, TensorRT-LLM.'],
      'Orca reported 36.9 times the throughput of FasterTransformer on GPT-3 175B at the same latency.'],
  ];
  $('#pair-pick').innerHTML = PAIRS.map((p, i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="${i === 0}">${p[0]}</button>`).join('');
  function pair(i) {
    const [, A, B, num] = PAIRS[i];
    $$('#pair-pick .chip').forEach(c => c.setAttribute('aria-pressed', String(+c.dataset.i === i)));
    const row = (l, a, b, cls = 'pc') => `<div class="pl">${l}</div><div class="${cls}">${a}</div><div class="${cls}">${b}</div>`;
    $('#pair').innerHTML = row('', A[0], B[0], 'ph') + row('Gives you', A[1], B[1]) + row('Costs you', A[2], B[2]) + row('Choose it for', A[3], B[3]) + `<div class="pn">${num}</div>`;
  }
  $$('#pair-pick .chip').forEach(c => c.onclick = () => pair(+c.dataset.i));
  pair(0);

  /* ---------------- quorum ---------------- */
  function quorum() {
    const qn = $('#q-n'), qw = $('#q-w'), qr = $('#q-r');
    const N = +qn.value;
    qw.max = N; qr.max = N;
    if (+qw.value > N) qw.value = N;
    if (+qr.value > N) qr.value = N;
    const Wq = +qw.value, Rq = +qr.value;
    $('#q-n-o').textContent = N; $('#q-w-o').textContent = Wq; $('#q-r-o').textContent = Rq;
    let s = '';
    const cx = i => 280 + (i - (N - 1) / 2) * 74;
    for (let i = 0; i < N; i++) {
      const isW = i < Wq, isR = i >= N - Rq;
      s += `<circle class="qn${isW ? ' w' : ''}" cx="${cx(i)}" cy="60" r="28"/>`;
      if (isR) s += `<circle class="rring" cx="${cx(i)}" cy="60" r="36"/>`;
      s += `<text x="${cx(i)}" y="67">${String.fromCharCode(65 + i)}</text>`;
    }
    $('#quorum').innerHTML = s;
    const ov = Rq + Wq - N;
    $('#q-read').innerHTML =
      (ov >= 1
        ? `<p><span class="ok">Reads overlap the latest write.</span> R + W = ${Rq + Wq} &gt; N = ${N}, so every read set includes at least ${ov} node${ov > 1 ? 's' : ''} holding the latest acknowledged write.</p>`
        : `<p><span class="no">Stale reads possible.</span> R + W = ${Rq + Wq} ≤ N = ${N}. The ${Rq} node${Rq > 1 ? 's' : ''} read here never saw the latest write.</p>`) +
      `<p class="q-key"><i class="qk-w"></i>acknowledged the latest write (W = ${Wq}) <i class="qk-r"></i>asked by the read (R = ${Rq}). The read set shown is the worst case, as far from the write set as it can be.</p>` +
      `<p>Writes keep working with <b>${N - Wq}</b> node${N - Wq === 1 ? '' : 's'} down; reads with <b>${N - Rq}</b> down. Each write waits for the ${ordinal(Wq)} fastest replica, each read for the ${ordinal(Rq)} fastest.</p>`;
  }
  function ordinal(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th'; }
  ['#q-n', '#q-w', '#q-r'].forEach(id => $(id).addEventListener('input', quorum));
  $$('#q-presets .chip').forEach(b => b.onclick = () => {
    const [n, w, r] = b.dataset.p.split(',').map(Number);
    $('#q-n').value = n; $('#q-w').max = n; $('#q-r').max = n; $('#q-w').value = w; $('#q-r').value = r; quorum();
  });
  quorum();

  /* ---------------- Kafka partition lab ---------------- */
  const KN = 5000;
  const KKEYS = Array.from({ length: KN }, (_, i) => `user-${i}`);
  const KH = KKEYS.map(k => toPos(murmur2(k)));
  const SALT = Array.from({ length: 8 }, (_, j) => toPos(murmur2(`user-0#${j}`)));
  let kAdd = '';
  function kafka() {
    const N = +$('#k-n').value, sk = +$('#k-s').value, salt = $('#k-salt').checked;
    $('#k-n-o').textContent = N; $('#k-s-o').textContent = sk.toFixed(1);
    const w = KKEYS.map((_, i) => 1 / Math.pow(i + 1, sk));
    const tot = w.reduce((a, b) => a + b, 0);
    const load = new Array(N).fill(0);
    KH.forEach((h, i) => {
      if (i === 0 && salt) SALT.forEach(hs => { load[hs % N] += w[0] / 8; });
      else load[h % N] += w[i];
    });
    const share = load.map(l => l / tot);
    const mx = Math.max(...share), hot = share.indexOf(mx);
    const top = w[0] / tot;
    // bars
    const x0 = 44, x1 = 630, y0 = 18, y1 = 196;
    const ymax = Math.max(0.05, Math.ceil(mx * 20) / 20);
    const bw = (x1 - x0) / N;
    let s = '';
    for (let t = 0; t <= ymax + 1e-9; t += ymax / 4) {
      const y = y1 - t / ymax * (y1 - y0);
      s += `<line class="grid" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/><text x="${x0 - 6}" y="${y + 4}" text-anchor="end">${(t * 100).toFixed(0)}%</text>`;
    }
    share.forEach((v, i) => {
      const hgt = v / ymax * (y1 - y0);
      s += `<rect class="b${i === hot ? ' hotb' : ''}" x="${x0 + i * bw + bw * 0.12}" y="${y1 - hgt}" width="${bw * 0.76}" height="${hgt}" rx="1.5"/>`;
      if (N <= 24 || i % 2 === 0) s += `<text x="${x0 + i * bw + bw / 2}" y="${y1 + 14}" text-anchor="middle">${i}</text>`;
    });
    const ym = y1 - (1 / N) / ymax * (y1 - y0);
    s += `<line class="mean" x1="${x0}" y1="${ym}" x2="${x1}" y2="${ym}"/><text class="lbl2" x="${x1}" y="${ym - 6}" text-anchor="end">fair share ${(100 / N).toFixed(1)}%</text>`;
    s += `<text x="${(x0 + x1) / 2}" y="${y1 + 32}" text-anchor="middle">partition</text>`;
    $('#k-bars').innerHTML = s;
    const eff = 1 / mx;
    let r = `The hottest partition, number ${hot}, carries <b>${pct(mx, 1)}</b> of messages against a fair share of ${pct(1 / N, 1)}. Its consumer is the bottleneck, so the topic runs like <b>${eff.toFixed(1)}</b> partitions, not ${N}.`;
    if (!salt && top > 1 / N) r += ` The most popular key alone is <em>${pct(top, 1)}</em> of traffic. Adding partitions cannot fix that, because one key always maps to one partition.`;
    if (salt) r += ` Salting spreads the top key across up to 8 partitions. The price: its messages are no longer in one order, so a consumer that needs per-key order must merge 8 sub-streams.`;
    $('#k-read').innerHTML = r + (kAdd ? `<br><br>${kAdd}` : '');
  }
  $('#k-add').onclick = () => {
    const N = +$('#k-n').value, sk = +$('#k-s').value;
    if (N >= 48) return;
    const w = KKEYS.map((_, i) => 1 / Math.pow(i + 1, sk));
    const tot = w.reduce((a, b) => a + b, 0);
    let mk = 0, mt = 0;
    KH.forEach((h, i) => { if (h % N !== h % (N + 1)) { mk++; mt += w[i]; } });
    $('#k-n').value = N + 1;
    kAdd = `Going from ${N} to ${N + 1} partitions sent <b>${pct(mk / KN)}</b> of keys, carrying <b>${pct(mt / tot)}</b> of traffic, to a different partition. Older messages for a moved key stay in the old partition and newer ones go to a different partition, so consumers can see that key out of order across the change. Kafka's documentation warns about exactly this.`;
    kafka();
  };
  ['#k-n', '#k-s', '#k-salt'].forEach(id => $(id).addEventListener('input', () => { kAdd = ''; kafka(); }));
  kafka();

  /* ---------------- PagedAttention lab ---------------- */
  const KV_TOK = Math.floor((EFF.mem * GPUS.h100.mem - MODELS.l8.w) / MODELS.l8.kv);
  const KV_BLK = Math.floor(KV_TOK / 16), KV_COLS = 240, KV_ROWS = Math.ceil(KV_BLK / KV_COLS);
  const kvRand = mulberry32(7);
  const KV_REQ = Array.from({ length: 4000 }, () => 48 + Math.floor(kvRand() * 1001));
  const kvShuf = (() => { const r = mulberry32(11), a = Array.from({ length: KV_BLK }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  // One colour per request: the post's markers plus lilac and teal, in mid tones so the
  // cream shared-prompt blocks (--ink) stand out from them and the dark free blocks recede.
  const PAL = ['#6a8ac4', '#5f9c78', '#c06e5f', '#9384bb', '#a88d4c', '#5c9aa2'];
  function kvLayout(mode) {
    const cell = new Int32Array(KV_BLK).fill(-1); // -1 free, -2 waste, -3 shared, >=0 request id
    let n = 0, stored = 0, blocks = 0, waste = 0;
    if (mode === 'reserve') {
      const per = 128;
      for (; (n + 1) * per <= KV_BLK && n < KV_REQ.length; n++) {
        const tot = 1000 + KV_REQ[n], u = Math.ceil(tot / 16);
        for (let b = 0; b < per; b++) cell[n * per + b] = b < u ? n : -2;
        stored += tot; blocks += per; waste += per - u;
      }
    } else {
      let p = 0;
      if (mode === 'shared') { for (let b = 0; b < 62; b++) cell[kvShuf[p++]] = -3; stored += 992; blocks += 62; }
      for (; n < KV_REQ.length; n++) {
        const own = mode === 'shared' ? 8 + KV_REQ[n] : 1000 + KV_REQ[n];
        const need = Math.ceil(own / 16);
        if (p + need > KV_BLK) break;
        for (let b = 0; b < need; b++) cell[kvShuf[p++]] = n;
        stored += own; blocks += need;
      }
    }
    return { cell, n, util: stored / (blocks * 16), waste };
  }
  const KV_ALL = { reserve: kvLayout('reserve'), paged: kvLayout('paged'), shared: kvLayout('shared') };
  let kvMode = 'reserve';
  function kvDraw() {
    const cv = $('#kv-canvas'), dpr = Math.min(2, devicePixelRatio || 1);
    const cw = 4, W0 = KV_COLS * cw, H0 = KV_ROWS * cw;
    if (cv.width !== W0 * dpr) { cv.width = W0 * dpr; cv.height = H0 * dpr; }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = cssv('--rule-2'); c.fillRect(0, 0, W0, H0);
    const L = KV_ALL[kvMode], ink = cssv('--ink'), mut = cssv('--muted');
    for (let i = 0; i < KV_BLK; i++) {
      const v = L.cell[i];
      if (v === -1) continue;
      const x = (i % KV_COLS) * cw, y = Math.floor(i / KV_COLS) * cw;
      if (v === -2) { c.fillStyle = mut; c.globalAlpha = .4; c.fillRect(x, y, cw - .6, cw - .6); c.globalAlpha = 1; continue; }
      c.fillStyle = v === -3 ? ink : PAL[v % PAL.length];
      c.fillRect(x, y, cw - .6, cw - .6);
    }
  }
  function kv(mode) {
    kvMode = mode;
    $$('#kv-mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
    const L = KV_ALL[mode], base = KV_ALL.reserve.n;
    const T = (v, l, c = '') => `<div class="tile2 ${c}"><b>${v}</b><span>${l}</span></div>`;
    $('#kv-tiles').innerHTML = T(fN(L.n), 'requests that fit', 'b') + T(pct(L.util), 'of allocated memory holds real tokens', 'g') +
      T(mode === 'reserve' ? fN(L.waste) : '0', 'blocks reserved but never used', 'r') + T((L.n / base).toFixed(1) + '×', 'requests compared with reserving 2,048', '');
    const R = {
      reserve: `The server cannot know how long an answer will run, so each request reserves room for 2,048 tokens up front. Only <b>${pct(L.util)}</b> of that reservation ever holds a token. The vLLM paper measured earlier systems using just 20 to 38 percent of KV memory for real token state, because they also lost memory to fragmentation.`,
      paged: `Blocks of 16 tokens are handed out as a sequence grows, from anywhere in memory, and a block table maps each sequence's logical blocks to physical ones. The only waste is the unfilled tail of each request's last block. The same memory now holds <b>${fN(L.n)}</b> requests. The vLLM team reports under 4 percent waste.`,
      shared: `Every request points at one copy of the system prompt's 62 full blocks. Only full blocks are shared, so the prompt's last 8 tokens sit in each request's own first block. The same memory now holds <b>${fN(L.n)}</b> requests, ${(L.n / base).toFixed(1)} times the reserved layout. Stated as a tradeoff: you pay in a block table, a scheduler and less contiguous memory, and get concurrency back.`,
    };
    $('#kv-read').innerHTML = R[mode];
    kvDraw();
  }
  $$('#kv-mode button').forEach(b => b.onclick = () => kv(b.dataset.m));
  kv('reserve');

  /* ---------------- batching curve ---------------- */
  const BCTX = [500, 1000, 2000, 4000, 8000];
  function batch() {
    const model = MODELS[$('#b-model').value], gpu = GPUS[$('#b-gpu').value];
    const ctx = BCTX[+$('#b-ctx').value], Bsel = 2 ** +$('#b-b').value;
    $('#b-ctx-o').textContent = fN(ctx) + ' tokens'; $('#b-b-o').textContent = fN(Bsel);
    const s = serving(model, gpu, ctx);
    const x0 = 78, x1 = 604;
    const X = B => x0 + Math.log2(B) / 10 * (x1 - x0);
    const pts = []; for (let i = 0; i <= 100; i++) { const B = 2 ** (i / 10); pts.push([B, 1 / s.step(B), B / s.step(B)]); }
    const aggMax = Math.max(...pts.map(p => p[2])), perMax = Math.max(...pts.map(p => p[1]));
    const nice = v => { const p = 10 ** Math.floor(Math.log10(v)); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
    const aM = nice(aggMax), pM = nice(perMax);
    const P1 = [20, 160], P2 = [222, 344];
    const Y1 = v => P1[1] - v / aM * (P1[1] - P1[0]), Y2 = v => P2[1] - v / pM * (P2[1] - P2[0]);
    let g = '';
    [[P1, aM, Y1, `Total tokens/s for one replica (${s.tp} GPU${s.tp > 1 ? 's' : ''})`], [P2, pM, Y2, 'Tokens/s for each stream']].forEach(([P, M, Y, title]) => {
      for (let k = 0; k <= 4; k++) { const v = M * k / 4, y = Y(v); g += `<line class="grid" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/><text x="${x0 - 6}" y="${y + 4}" text-anchor="end">${fN(v)}</text>`; }
      g += `<text class="lbl2" x="${x0}" y="${P[0] - 6}">${title}</text>`;
    });
    for (let k = 0; k <= 10; k += 2) g += `<text x="${X(2 ** k)}" y="${P2[1] + 18}" text-anchor="middle">${fN(2 ** k)}</text>`;
    g += `<text x="${(x0 + x1) / 2}" y="${P2[1] + 34}" text-anchor="middle">batch size (streams decoded together)</text>`;
    const path = (Y, idx, from, to) => pts.filter(p => p[0] >= from && p[0] <= to).map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[idx]).toFixed(1)}`).join('');
    const bm = Math.max(1, Math.min(1024, s.bMem));
    g += `<path class="ln" d="${path(Y1, 2, 1, bm)}"/><path class="ln past" d="${path(Y1, 2, bm, 1024)}"/>`;
    g += `<path class="ln g" d="${path(Y2, 1, 1, bm)}"/><path class="ln g past" d="${path(Y2, 1, bm, 1024)}"/>`;
    if (s.bMem >= 1 && s.bMem <= 1024) {
      const xb = X(s.bMem);
      g += `<line class="full" x1="${xb}" y1="${P1[0]}" x2="${xb}" y2="${P2[1]}"/><text class="lbl2" x="${xb + (xb > 470 ? -6 : 6)}" y="${P1[0] + 14}" text-anchor="${xb > 470 ? 'end' : 'start'}" style="fill:var(--red-text)">KV cache full at ${fN(s.bMem)} streams</text>`;
    }
    const st = s.step(Bsel);
    g += `<circle class="mk" cx="${X(Bsel)}" cy="${Y1(Bsel / st)}" r="5.5"/><circle class="mk" cx="${X(Bsel)}" cy="${Y2(1 / st)}" r="5.5"/>`;
    $('#b-chart').innerHTML = g;
    const st1 = s.step(1), bound = s.memT(Bsel) >= s.flT(Bsel) ? 'memory bandwidth' : 'compute';
    let r = `At batch 1, each step reads <b>${fmtB(model.w)}</b> of weights to make one token: <b>${(st1 * 1000).toFixed(1)} ms</b>, ${fN(1 / st1)} tokens/s. ` +
      `At batch ${fN(Bsel)}, the step reads the same weights plus ${fN(Bsel)} streams of KV cache, ${fmtB(model.w + Bsel * s.perSeq)} in all: <b>${(st * 1000).toFixed(1)} ms</b>, <b>${fN(Bsel / st)}</b> tokens/s in total and <b>${fN(1 / st)}</b> per stream. The step is bound by ${bound}.`;
    if (Bsel > s.bMem) r += ` <em>This batch does not fit.</em> At ${fN(ctx)} tokens of context the KV cache holds ${fN(s.bMem)} streams.`;
    $('#b-read').innerHTML = r;
  }
  ['#b-model', '#b-gpu', '#b-ctx', '#b-b'].forEach(id => $(id).addEventListener('input', batch));
  batch();

  /* ---------------- resharding lab ---------------- */
  const SK = 20000;
  const SKH = Array.from({ length: SK }, (_, i) => murmur2(`row-${i}`));
  let SS = 32;
  function ringOf(n) {
    const pts = [];
    for (let j = 0; j < n; j++) for (let v = 0; v < 100; v++) pts.push([murmur2(`node-${j}-v${v}`) >>> 0, j]);
    pts.sort((a, b) => a[0] - b[0]);
    const pos = pts.map(p => p[0]), own = pts.map(p => p[1]);
    return h => { let lo = 0, hi = pos.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (pos[mid] < h) lo = mid + 1; else hi = mid; } return own[lo === pos.length ? 0 : lo]; };
  }
  function shards() {
    const N = +$('#s-n').value; $('#s-n-o').textContent = N;
    $$('#s-S button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.s === SS)));
    const res = [];
    // hash mod N
    let oldShuffle = 0;
    { const ld = new Array(N + 1).fill(0); let mv = 0; SKH.forEach(h => { const p = toPos(h); if (p % N !== p % (N + 1)) { mv++; if (p % (N + 1) !== N) oldShuffle++; } ld[p % (N + 1)]++; }); res.push(['Hash mod N', mv / SK, ld]); }
    // consistent hashing ring
    { const a = ringOf(N), b = ringOf(N + 1); const ld = new Array(N + 1).fill(0); let mv = 0; SKH.forEach(h => { const u = h >>> 0, o1 = a(u), o2 = b(u); if (o1 !== o2) mv++; ld[o2]++; }); res.push(['Consistent hashing ring', mv / SK, ld]); }
    // logical shards moved whole
    {
      const owner = Array.from({ length: SS }, (_, i) => i % N);
      const cnt = new Array(N + 1).fill(0); owner.forEach(o => cnt[o]++);
      const target = Math.floor(SS / (N + 1)), moved = new Set();
      while (cnt[N] < target) {
        let best = 0; for (let j = 1; j < N; j++) if (cnt[j] > cnt[best]) best = j;
        let sh = -1; for (let i = SS - 1; i >= 0; i--) if (owner[i] === best && !moved.has(i)) { sh = i; break; }
        owner[sh] = N; moved.add(sh); cnt[best]--; cnt[N]++;
      }
      const ld = new Array(N + 1).fill(0); let mv = 0;
      SKH.forEach(h => { const sh = toPos(h) % SS; if (moved.has(sh)) mv++; ld[owner[sh]]++; });
      res.push([`${SS} logical shards, moved whole`, mv / SK, ld]);
    }
    const ideal = 1 / (N + 1);
    const bx0 = 0, bx1 = 330, lx0 = 372, lx1 = 636;
    let g = `<text class="lbl2" x="${lx0}" y="14">rows per node after</text>`;
    res.forEach(([name, mv, ld], k) => {
      const y = 44 + k * 96;
      g += `<text class="lbl2" x="0" y="${y - 6}">${name}</text>`;
      g += `<rect class="st" x="${bx0}" y="${y}" width="${bx1 - bx0}" height="24" rx="2"/><rect class="mv" x="${bx0}" y="${y}" width="${(bx1 - bx0) * mv}" height="24" rx="2"/>`;
      const xi = bx0 + (bx1 - bx0) * ideal;
      g += `<line class="ideal" x1="${xi}" y1="${y - 4}" x2="${xi}" y2="${y + 28}"/>`;
      g += `<text x="0" y="${y + 44}">${pct(mv, 1)} of rows moved · ideal ${pct(ideal, 1)}</text>`;
      const mxl = Math.max(...ld), mean = SK / (N + 1), bw = (lx1 - lx0) / (N + 1);
      ld.forEach((v, j) => { const hh = v / mxl * 36; g += `<rect class="nl2" x="${lx0 + j * bw + 1}" y="${y + 24 - hh}" width="${Math.max(1, bw - 2)}" height="${hh}"${j === N ? ' style="fill:var(--green);opacity:.9"' : ''}/>`; });
      g += `<text x="${lx0}" y="${y + 44}">busiest ${(mxl / mean).toFixed(2)}× mean</text>`;
    });
    $('#s-chart').innerHTML = g;
    const [m, rg, ls] = res;
    const lsMax = Math.max(...ls[2]) / (SK / (N + 1));
    $('#s-read').innerHTML = `Adding node ${N + 1}: hash mod N moves <b>${pct(m[1])}</b> of rows, and <b>${pct(oldShuffle / SK)}</b> of all rows only shuffle between old nodes. ` +
      `The ring moves <b>${pct(rg[1])}</b>, close to the ideal ${pct(ideal)}, and every moved row goes to the new node. ` +
      `${SS} logical shards move <b>${pct(ls[1])}</b>, as whole shards that can be copied and switched one at a time. Their balance is limited by ${SS} ÷ ${N + 1} shards per node: the busiest node holds <b>${lsMax.toFixed(2)}×</b> the mean. ` +
      `Kafka partitions follow the first scheme, which is why adding partitions remaps keys.`;
  }
  $('#s-n').addEventListener('input', shards);
  $$('#s-S button').forEach(b => b.onclick = () => { SS = +b.dataset.s; shards(); });
  shards();

  /* ---------------- failure drill ---------------- */
  const DN = {
    clients: [20, 150, 110, 60, 'Clients'],
    gw: [170, 150, 130, 60, 'API gateway'],
    rl: [170, 30, 130, 56, 'Rate limiter'],
    kafka: [345, 30, 150, 56, 'Usage log (Kafka)'],
    router: [345, 150, 150, 60, 'KV-aware router'],
    g1: [560, 66, 170, 54, 'GPU replica 1'],
    g2: [560, 150, 170, 54, 'GPU replica 2'],
    g3: [560, 234, 170, 54, 'GPU replica 3'],
    pg: [345, 262, 150, 74, 'Conversations'],
  };
  const DA = { 'clients-gw': [130, 180, 170, 180], 'gw-rl': [235, 150, 235, 86], 'gw-kafka': [300, 160, 345, 72], 'gw-router': [300, 180, 345, 180], 'router-g1': [495, 170, 560, 96], 'router-g2': [495, 180, 560, 177], 'router-g3': [495, 190, 560, 258], 'gw-pg': [300, 200, 345, 290] };
  const FAIL = {
    gw: { node: ['gw'], dim: [], t: 'One gateway instance dies', u: 'Requests on that instance fail until the load balancer’s health check removes it. Streams open on it are cut.', m: '5xx rate and open connections per instance; failed health checks.', l: 'Run N + 1 instances behind the load balancer. Clients retry with an idempotency key so a retry cannot bill twice.', b: '1 / N of new requests for a few seconds, plus the streams that instance held.' },
    rl: { node: ['rl'], dim: [], t: 'The rate limiter’s store goes down', u: 'Failing closed, every request gets a 429. Failing open, nobody is limited and one heavy caller can fill the GPUs.', m: 'Limiter call errors and latency; GPU queue depth if it failed open.', l: 'Fail open to a local token bucket in each gateway instance. Limits loosen for a while and never disappear.', b: 'Everyone, through either rejections or a noisy neighbour.' },
    router: { node: ['router'], dim: [], t: 'The KV-aware router crashes', u: 'With a least-loaded fallback, answers still arrive, but start later. Requests land on GPUs that do not hold their prefix, so the prompt is processed again.', m: 'Prefix cache hit rate falls; time to first token rises at p50 and p99.', l: 'Keep the router stateless and rebuild its map from GPU reports. Fall back to least-loaded routing while it restarts.', b: 'Latency for everyone, with no errors.' },
    gpu: { node: ['g2'], dim: ['router-g2'], t: 'One GPU replica dies', u: 'Every stream on that replica stops mid-answer.', m: 'Stream error rate; replica health checks and GPU error counters.', l: 'Retry on another replica, from the start or with the text so far added to the prompt. Keep spare capacity for one replica.', b: 'Every stream on that replica: a few hundred at the batch sizes above.' },
    kvfull: { node: ['g1', 'g2', 'g3'], dim: [], t: 'The KV cache fills up', u: 'New requests wait in the queue. Some running streams pause while the scheduler drops their blocks to recompute later or swaps them to CPU memory.', m: 'KV cache utilization near 100%, preemption count, queue time.', l: 'Admission control at the router, a lower output-token cap under load, and autoscaling on KV utilization instead of GPU busy time.', b: 'Latency for everyone at peak.' },
    pg: { node: ['pg'], dim: ['gw-pg'], t: 'One Postgres shard primary fails', u: 'Users whose conversations live on that shard cannot load their history. Everyone else is unaffected.', m: 'Error rate per shard; replication lag on that shard’s replicas.', l: 'Promote a replica with automated failover. Meanwhile, let affected users start a new conversation without history.', b: '1 / N of users, for the length of the failover.' },
    broker: { node: ['kafka'], dim: [], t: 'One Kafka broker fails', u: 'Nothing, if the topic is set up for it.', m: 'Under-replicated partitions; producer errors and retries.', l: 'Replication factor 3 with min.insync.replicas = 2 and acks=all keeps writes flowing with one broker down. Buffer usage events locally and never block an answer on the billing write.', b: 'None with that setup. With replication factor 1, lost usage records and gaps in billing.' },
  };
  const NODE2F = { gw: 'gw', rl: 'rl', router: 'router', g1: 'kvfull', g2: 'gpu', g3: 'kvfull', pg: 'pg', kafka: 'broker' };
  const FNAME = { gw: 'Gateway instance', rl: 'Rate-limiter store', router: 'Router', gpu: 'GPU replica', kvfull: 'KV cache full', pg: 'Postgres shard', broker: 'Kafka broker' };
  (function drawDrill() {
    let s = '';
    Object.entries(DA).forEach(([k, [a, b, c, d]]) => {
      const ang = Math.atan2(d - b, c - a), hx = c - 10 * Math.cos(ang - .45), hy = d - 10 * Math.sin(ang - .45), kx = c - 10 * Math.cos(ang + .45), ky = d - 10 * Math.sin(ang + .45);
      s += `<path class="ar" data-a="${k}" d="M${a},${b} L${c},${d} M${hx.toFixed(1)},${hy.toFixed(1)} L${c},${d} L${kx.toFixed(1)},${ky.toFixed(1)}"/>`;
    });
    Object.entries(DN).forEach(([k, [x, y, w, h, l]]) => {
      const f = NODE2F[k];
      const shape = k === 'pg'
        ? `<path d="M${x},${y + 10} q${w / 2},-20 ${w},0 v${h - 20} q-${w / 2},20 -${w},0 z M${x},${y + 10} q${w / 2},20 ${w},0"/>`
        : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`;
      const label = k === 'pg' ? `<text x="${x + w / 2}" y="${y + h / 2 + 6}">${l}</text><text x="${x + w / 2}" y="${y + h / 2 + 26}" style="font-size:14px">sharded Postgres</text>` : `<text x="${x + w / 2}" y="${y + h / 2 + 6}">${l}</text>`;
      s += `<g class="nd" data-n="${k}"${f ? ` tabindex="0" role="button" aria-label="Fail: ${l}"` : ''}>${shape}${label}<g class="xmark" hidden><line class="x" x1="${x + w - 26}" y1="${y + 8}" x2="${x + w - 8}" y2="${y + 26}"/><line class="x" x1="${x + w - 8}" y1="${y + 8}" x2="${x + w - 26}" y2="${y + 26}"/></g></g>`;
    });
    $('#drill').innerHTML = s;
  })();
  $('#drill-pick').innerHTML = Object.keys(FAIL).map(k => `<button type="button" class="chip" data-f="${k}" aria-pressed="false">${FNAME[k]}</button>`).join('');
  function drill(k) {
    const f = FAIL[k];
    $$('#drill-pick .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.f === k)));
    $$('#drill .nd').forEach(n => { const on = f.node.includes(n.dataset.n); n.classList.toggle('fail', on); n.querySelector('.xmark').toggleAttribute('hidden', !on); });
    $$('#drill .ar').forEach(a => a.classList.toggle('dim', f.dim.includes(a.dataset.a)));
    $('#drill-card').innerHTML = `<h4>${f.t}</h4><div><span class="k">Users see</span><p>${f.u}</p></div><div><span class="k">First metric to move</span><p>${f.m}</p></div><div><span class="k">What limits the damage</span><p>${f.l}</p></div><div><span class="k">Blast radius</span><p>${f.b}</p></div>`;
  }
  $$('#drill-pick .chip').forEach(c => c.onclick = () => drill(c.dataset.f));
  $$('#drill .nd[tabindex]').forEach(n => {
    const go = () => drill(NODE2F[n.dataset.n]);
    n.addEventListener('click', go);
    n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  drill('gpu');

  /* ---------------- same-page links ---------------- */
  root.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const t = root.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
    e.preventDefault();
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.scrollIntoView({ block: 'start' });
    t.focus({ preventScroll: true });
  });

  paintClock(); paintPans(); reveal();

  return () => {
    lifetime.abort();
    io?.disconnect();
    timers.forEach(clearTimeout); timers.clear();
    cancelAnimationFrame(raf); cancelAnimationFrame(timer);
  };
}
