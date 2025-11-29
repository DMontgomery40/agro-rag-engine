// AGRO Storage Calculator Suite v1.2 - TSX Component
// Proper React conversion of the legacy storage calculator
// Connected to Pydantic config for default values

import { useState, useEffect, useCallback } from 'react';
import '@/styles/storage-calculator.css';
import { configApi } from '@/api/config';

// Utility functions
function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes === 0) return '0 B';
  const abs = Math.abs(bytes);
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

  if (abs < KB) return `${bytes.toFixed(0)} B`;
  if (abs < MB) return `${nf.format(bytes / KB)} KiB`;
  if (abs < GB) return `${nf.format(bytes / MB)} MiB`;
  if (abs < TB) return `${nf.format(bytes / GB)} GiB`;
  return `${nf.format(bytes / TB)} TiB`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Calculator 1 inputs
interface Calc1Inputs {
  repoSize: number;
  repoUnit: number;
  chunkSize: number;
  chunkUnit: number;
  embDim: number;
  precision: number;
  qdrant: number;
  hydration: number;
  redis: number;
  replication: number;
}

// Calculator 2 inputs
interface Calc2Inputs {
  repoSize: number;
  repoUnit: number;
  targetSize: number;
  targetUnit: number;
  chunkSize: number;
  chunkUnit: number;
  embDim: number;
  bm25pct: number;
  cardspct: number;
}

// Calculator 1 results
interface Calc1Results {
  chunks: number;
  embeddings: number;
  qdrantSize: number;
  bm25: number;
  cards: number;
  hydration: number;
  reranker: number;
  redisSize: number;
  singleTotal: number;
  replicatedTotal: number;
}

// Calculator 2 results
interface Calc2Results {
  chunks: number;
  baseStorage: number;
  float32: number;
  float16: number;
  int8: number;
  pq8: number;
  aggressiveTotal: number;
  aggressiveReplicated: number;
  aggressiveFits: boolean;
  conservativeTotal: number;
  conservativeReplicated: number;
  conservativeFits: boolean;
  statusMessage: string;
  statusType: 'success' | 'warning';
}

export function StorageCalculatorSuite() {
  const [configLoaded, setConfigLoaded] = useState(false);

  // Calculator 1 state - defaults will be overwritten by Pydantic config
  const [calc1, setCalc1] = useState<Calc1Inputs>({
    repoSize: 5,
    repoUnit: 1073741824, // GiB
    chunkSize: 4,
    chunkUnit: 1024, // KiB
    embDim: 3072, // Default for text-embedding-3-large
    precision: 4, // float32
    qdrant: 1.5,
    hydration: 100,
    redis: 400,
    replication: 3,
  });

  // Calculator 2 state - defaults will be overwritten by Pydantic config
  const [calc2, setCalc2] = useState<Calc2Inputs>({
    repoSize: 5,
    repoUnit: 1073741824, // GiB
    targetSize: 5,
    targetUnit: 1073741824, // GiB
    chunkSize: 4,
    chunkUnit: 1024, // KiB
    embDim: 3072, // Default for text-embedding-3-large
    bm25pct: 20,
    cardspct: 10,
  });

  // Load defaults from Pydantic config
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await configApi.getAll();
        const embDim = config.values?.EMBEDDING_DIM || 3072;
        
        setCalc1(prev => ({ ...prev, embDim }));
        setCalc2(prev => ({ ...prev, embDim }));
        setConfigLoaded(true);
      } catch (err) {
        console.error('[StorageCalculatorSuite] Failed to load config:', err);
        setConfigLoaded(true); // Continue with defaults
      }
    }
    loadConfig();
  }, []);

  // Results state
  const [results1, setResults1] = useState<Calc1Results | null>(null);
  const [results2, setResults2] = useState<Calc2Results | null>(null);

  // Calculate Storage 1
  const calculateStorage1 = useCallback(() => {
    const R = calc1.repoSize * calc1.repoUnit;
    const C = calc1.chunkSize * calc1.chunkUnit;

    if (!C || C <= 0) return;

    const D = calc1.embDim;
    const B = calc1.precision;
    const Q = calc1.qdrant;
    const hydrationPct = calc1.hydration / 100;
    const redisBytes = calc1.redis * 1048576;
    const replFactor = calc1.replication;

    const N = Math.ceil(R / C);
    const E = N * D * B;
    const Q_bytes = E * Q;
    const BM25 = 0.20 * R;
    const CARDS = 0.10 * R;
    const HYDR = hydrationPct * R;
    const RER = 0.5 * E;

    const singleTotal = E + Q_bytes + BM25 + CARDS + HYDR + RER + redisBytes;
    const criticalComponents = E + Q_bytes + HYDR + CARDS + RER;
    const replicatedTotal = singleTotal + (replFactor - 1) * criticalComponents;

    setResults1({
      chunks: N,
      embeddings: E,
      qdrantSize: Q_bytes,
      bm25: BM25,
      cards: CARDS,
      hydration: HYDR,
      reranker: RER,
      redisSize: redisBytes,
      singleTotal,
      replicatedTotal,
    });
  }, [calc1]);

  // Calculate Storage 2
  const calculateStorage2 = useCallback(() => {
    const R = calc2.repoSize * calc2.repoUnit;
    const targetBytes = calc2.targetSize * calc2.targetUnit;
    const C = calc2.chunkSize * calc2.chunkUnit;

    if (!C || C <= 0) return;

    const D = calc2.embDim;
    const bm25Pct = calc2.bm25pct / 100;
    const cardsPct = calc2.cardspct / 100;

    // Shared params from calc1
    const qdrantMultiplier = calc1.qdrant;
    const hydrationPct = calc1.hydration / 100;
    const redisBytesInput = calc1.redis * 1048576;
    const replicationFactor = calc1.replication;

    const N = Math.ceil(R / C);
    const E_float32 = N * D * 4;
    const E_float16 = E_float32 / 2;
    const E_int8 = E_float32 / 4;
    const E_pq8 = E_float32 / 8;

    const BM25 = bm25Pct * R;
    const CARDS = cardsPct * R;

    // Aggressive plan: PQ 8x, no local hydration
    const aggressiveEmbedding = E_pq8;
    const aggressiveQ = E_pq8 * qdrantMultiplier;
    const aggressiveRer = 0.5 * E_pq8;
    const aggressiveTotal = aggressiveEmbedding + aggressiveQ + BM25 + CARDS + redisBytesInput + aggressiveRer;
    const aggressiveCritical = aggressiveEmbedding + aggressiveQ + CARDS + aggressiveRer;
    const aggressiveReplicated = aggressiveTotal + (replicationFactor - 1) * aggressiveCritical;
    const aggressiveFits = aggressiveTotal <= targetBytes;

    // Conservative plan: float16 precision, full hydration
    const conservativeEmbedding = E_float16;
    const conservativeQ = conservativeEmbedding * qdrantMultiplier;
    const conservativeRer = 0.5 * conservativeEmbedding;
    const conservativeHydration = hydrationPct * R;
    const conservativeTotal = conservativeEmbedding + conservativeQ + conservativeHydration + BM25 + CARDS + conservativeRer + redisBytesInput;
    const conservativeCritical = conservativeEmbedding + conservativeQ + conservativeHydration + CARDS + conservativeRer;
    const conservativeReplicated = conservativeTotal + (replicationFactor - 1) * conservativeCritical;
    const conservativeFits = conservativeTotal <= targetBytes;

    let statusMessage: string;
    let statusType: 'success' | 'warning';

    if (aggressiveFits && conservativeFits) {
      statusType = 'success';
      statusMessage = `✓ Both configurations fit within your ${formatBytes(targetBytes)} limit`;
    } else if (aggressiveFits) {
      statusType = 'warning';
      statusMessage = `⚠ Only Minimal config fits. Low Latency config needs ${formatBytes(conservativeTotal - targetBytes)} more storage.`;
    } else {
      statusType = 'warning';
      statusMessage = `⚠ Both exceed limit. Minimal needs ${formatBytes(aggressiveTotal - targetBytes)} more. Consider larger chunks or stronger compression.`;
    }

    setResults2({
      chunks: N,
      baseStorage: R,
      float32: E_float32,
      float16: E_float16,
      int8: E_int8,
      pq8: E_pq8,
      aggressiveTotal,
      aggressiveReplicated,
      aggressiveFits,
      conservativeTotal,
      conservativeReplicated,
      conservativeFits,
      statusMessage,
      statusType,
    });
  }, [calc2, calc1.qdrant, calc1.hydration, calc1.redis, calc1.replication]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateStorage1();
    calculateStorage2();
  }, [calculateStorage1, calculateStorage2]);

  return (
    <div className="storage-calc-wrapper">
      <div className="storage-calc-header">
        <h1><span className="brand">AGRO</span> Storage Calculator Suite</h1>
        <p className="subtitle">Another Good RAG Option • Enterprise Memory Planning</p>
        <div className="info-box">
          <p>
            <strong>Left:</strong> Calculate exact storage needs for your configuration.<br />
            <strong>Right:</strong> See if your data fits within a target limit using different strategies.
          </p>
        </div>
      </div>

      <div className="calculators-grid">
        {/* Calculator 1: Storage Requirements */}
        <div className="calculator">
          <div className="calculator-title">
            Storage Requirements
            <span className="calculator-badge">Full Stack</span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            Calculate total storage for your chosen configuration with all components.
          </p>

          <div className="input-section">
            <div className="input-row">
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Repository Size
                    <span className="tooltip" title="Total size of your data/documents to index">?</span>
                  </div>
                </label>
                <div className="unit-input">
                  <input
                    type="number"
                    value={calc1.repoSize}
                    onChange={(e) => setCalc1({ ...calc1, repoSize: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                    min="0.1"
                  />
                  <select
                    value={calc1.repoUnit}
                    onChange={(e) => setCalc1({ ...calc1, repoUnit: parseFloat(e.target.value) })}
                  >
                    <option value="1048576">MiB</option>
                    <option value="1073741824">GiB</option>
                    <option value="1099511627776">TiB</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Chunk Size
                    <span className="tooltip" title="Size of text chunks for embedding. Typically 1-8 KiB">?</span>
                  </div>
                </label>
                <div className="unit-input">
                  <input
                    type="number"
                    value={calc1.chunkSize}
                    onChange={(e) => setCalc1({ ...calc1, chunkSize: parseFloat(e.target.value) || 0 })}
                    step="1"
                    min="0.001"
                  />
                  <select
                    value={calc1.chunkUnit}
                    onChange={(e) => setCalc1({ ...calc1, chunkUnit: parseFloat(e.target.value) })}
                  >
                    <option value="1024">KiB</option>
                    <option value="1048576">MiB</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Embedding Dimension
                    <span className="tooltip" title="Vector size: 512 (small), 768 (BERT), 1536 (OpenAI)">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc1.embDim}
                  onChange={(e) => setCalc1({ ...calc1, embDim: parseInt(e.target.value) || 0 })}
                  step="1"
                  min="1"
                />
              </div>
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Precision
                    <span className="tooltip" title="float32: full precision, float16: half size, int8: quarter size">?</span>
                  </div>
                </label>
                <select
                  value={calc1.precision}
                  onChange={(e) => setCalc1({ ...calc1, precision: parseFloat(e.target.value) })}
                >
                  <option value="4">float32</option>
                  <option value="2">float16</option>
                  <option value="1">int8</option>
                </select>
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Qdrant Overhead
                    <span className="tooltip" title="Vector DB index overhead. Typically 1.5x embedding size">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc1.qdrant}
                  onChange={(e) => setCalc1({ ...calc1, qdrant: parseFloat(e.target.value) || 1 })}
                  step="0.1"
                  min="1"
                />
              </div>
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Hydration %
                    <span className="tooltip" title="% of raw data kept in RAM for instant retrieval">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc1.hydration}
                  onChange={(e) => setCalc1({ ...calc1, hydration: parseFloat(e.target.value) || 0 })}
                  step="10"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Redis Cache (MiB)
                    <span className="tooltip" title="Session/chat memory storage">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc1.redis}
                  onChange={(e) => setCalc1({ ...calc1, redis: parseFloat(e.target.value) || 0 })}
                  step="50"
                  min="0"
                />
              </div>
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Replication Factor
                    <span className="tooltip" title="Number of copies for HA/scaling">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc1.replication}
                  onChange={(e) => setCalc1({ ...calc1, replication: parseInt(e.target.value) || 1 })}
                  step="1"
                  min="1"
                />
              </div>
            </div>
          </div>

          {results1 && (
            <div className="results">
              <div className="result-grid">
                <div className="result-item">
                  <span className="result-label">Chunks</span>
                  <span className="result-value">{formatNumber(results1.chunks)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Raw Embeddings</span>
                  <span className="result-value">{formatBytes(results1.embeddings)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Qdrant</span>
                  <span className="result-value">{formatBytes(results1.qdrantSize)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">BM25 Index</span>
                  <span className="result-value">{formatBytes(results1.bm25)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Cards/Summary</span>
                  <span className="result-value">{formatBytes(results1.cards)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Hydration</span>
                  <span className="result-value">{formatBytes(results1.hydration)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Reranker</span>
                  <span className="result-value">{formatBytes(results1.reranker)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Redis</span>
                  <span className="result-value">{formatBytes(results1.redisSize)}</span>
                </div>
              </div>

              <div className="total-row">
                <div className="result-item">
                  <span className="result-label">Single Instance</span>
                  <span className="result-value">{formatBytes(results1.singleTotal)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Replicated (×{calc1.replication})</span>
                  <span className="result-value">{formatBytes(results1.replicatedTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calculator 2: Optimization Planner */}
        <div className="calculator">
          <div className="calculator-title">
            Optimization Planner
            <span className="calculator-badge">Fit Analysis</span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            Compare two strategies: <strong>Minimal</strong> (smallest footprint, fetches data on-demand) vs <strong>Low Latency</strong> (everything in RAM for instant access).
          </p>

          <div className="input-section">
            <div className="input-row">
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Repository Size
                    <span className="tooltip" title="Same as left calculator - your total data">?</span>
                  </div>
                </label>
                <div className="unit-input">
                  <input
                    type="number"
                    value={calc2.repoSize}
                    onChange={(e) => setCalc2({ ...calc2, repoSize: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                    min="0.1"
                  />
                  <select
                    value={calc2.repoUnit}
                    onChange={(e) => setCalc2({ ...calc2, repoUnit: parseFloat(e.target.value) })}
                  >
                    <option value="1048576">MiB</option>
                    <option value="1073741824">GiB</option>
                    <option value="1099511627776">TiB</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Target Limit
                    <span className="tooltip" title="Max storage you want to use">?</span>
                  </div>
                </label>
                <div className="unit-input">
                  <input
                    type="number"
                    value={calc2.targetSize}
                    onChange={(e) => setCalc2({ ...calc2, targetSize: parseFloat(e.target.value) || 0 })}
                    step="0.5"
                    min="0.1"
                  />
                  <select
                    value={calc2.targetUnit}
                    onChange={(e) => setCalc2({ ...calc2, targetUnit: parseFloat(e.target.value) })}
                  >
                    <option value="1073741824">GiB</option>
                    <option value="1099511627776">TiB</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Chunk Size
                    <span className="tooltip" title="Smaller chunks = more vectors = more storage">?</span>
                  </div>
                </label>
                <div className="unit-input">
                  <input
                    type="number"
                    value={calc2.chunkSize}
                    onChange={(e) => setCalc2({ ...calc2, chunkSize: parseFloat(e.target.value) || 0 })}
                    step="1"
                    min="0.001"
                  />
                  <select
                    value={calc2.chunkUnit}
                    onChange={(e) => setCalc2({ ...calc2, chunkUnit: parseFloat(e.target.value) })}
                  >
                    <option value="1024">KiB</option>
                    <option value="1048576">MiB</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Embedding Dims
                    <span className="tooltip" title="Must match your model choice">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc2.embDim}
                  onChange={(e) => setCalc2({ ...calc2, embDim: parseInt(e.target.value) || 0 })}
                  step="1"
                  min="1"
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    BM25 Overhead %
                    <span className="tooltip" title="Text search index, typically 20% of data">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc2.bm25pct}
                  onChange={(e) => setCalc2({ ...calc2, bm25pct: parseFloat(e.target.value) || 0 })}
                  step="5"
                  min="0"
                  max="100"
                />
              </div>
              <div className="input-group">
                <label>
                  <div className="label-with-tooltip">
                    Cards/Summary %
                    <span className="tooltip" title="Metadata/summaries, typically 10% of data">?</span>
                  </div>
                </label>
                <input
                  type="number"
                  value={calc2.cardspct}
                  onChange={(e) => setCalc2({ ...calc2, cardspct: parseFloat(e.target.value) || 0 })}
                  step="5"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {results2 && (
            <div className="results">
              <div className="result-grid">
                <div className="result-item">
                  <span className="result-label">Chunks</span>
                  <span className="result-value">{formatNumber(results2.chunks)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Repository</span>
                  <span className="result-value">{formatBytes(results2.baseStorage)}</span>
                </div>
              </div>

              <div className="plan-title">Embedding Size by Precision (raw vectors only)</div>
              <div className="result-grid">
                <div className="result-item">
                  <span className="result-label">float32 (baseline)</span>
                  <span className="result-value">{formatBytes(results2.float32)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">float16 (half size)</span>
                  <span className="result-value">{formatBytes(results2.float16)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">int8 (quarter size)</span>
                  <span className="result-value">{formatBytes(results2.int8)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">
                    Product Quantization
                    <span className="tooltip" title="Aggressive compression: 8× smaller but ~5% accuracy loss" style={{ marginLeft: '4px' }}>?</span>
                  </span>
                  <span className="result-value">{formatBytes(results2.pq8)}</span>
                </div>
              </div>

              <div className="plans-section">
                <div className="plan-title">Configuration Plans</div>
                <div className="plan-grid">
                  <div className={`plan-card ${results2.aggressiveFits ? 'fits' : 'exceeds'}`}>
                    <div className="plan-name">Minimal (No Hydration)</div>
                    <div className="plan-details" style={{ lineHeight: 1.8 }}>
                      <strong>Includes:</strong><br />
                      • Product Quantized vectors<br />
                      • Qdrant index<br />
                      • BM25 search<br />
                      • Cards/metadata<br />
                      • Reranker cache<br />
                      • Redis<br />
                      <strong>Excludes:</strong><br />
                      • Raw data (fetched on-demand)
                    </div>
                    <div className="plan-total">{formatBytes(results2.aggressiveTotal)}</div>
                  </div>
                  <div className={`plan-card ${results2.conservativeFits ? 'fits' : 'exceeds'}`}>
                    <div className="plan-name">Low Latency (Full Cache)</div>
                    <div className="plan-details" style={{ lineHeight: 1.8 }}>
                      <strong>Includes:</strong><br />
                      • float16 vectors<br />
                      • Qdrant index<br />
                      • BM25 search<br />
                      • Cards/metadata<br />
                      • Reranker cache<br />
                      • Redis<br />
                      • <span style={{ color: 'var(--warn)' }}>Data in RAM (per left hydration %)</span>
                    </div>
                    <div className="plan-total">{formatBytes(results2.conservativeTotal)}</div>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--fg-muted)', margin: '16px 0 8px', padding: '12px', background: 'var(--card-bg)', borderRadius: '4px', lineHeight: 1.5 }}>
                  💡 <strong>Why the big difference?</strong> Low Latency keeps data in RAM based on hydration % from left panel (currently adding {calc1.hydration}% of repo size). Minimal only stores compressed vectors and indexes, fetching actual data from disk when needed.
                </p>

                <div className="total-row" style={{ marginTop: '20px' }}>
                  <div className="result-item">
                    <span className="result-label">Minimal × {calc1.replication} replicas</span>
                    <span className="result-value">{formatBytes(results2.aggressiveReplicated)}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Low Latency × {calc1.replication} replicas</span>
                    <span className="result-value">{formatBytes(results2.conservativeReplicated)}</span>
                  </div>
                </div>

                <div className={results2.statusType} style={{ marginTop: '12px' }}>
                  {results2.statusMessage}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="storage-calc-footer">
        <p>AGRO (Another Good RAG Option) • Enterprise Storage Calculator v1.2</p>
        <p>Precision calculations for vector search infrastructure</p>
      </div>
    </div>
  );
}

