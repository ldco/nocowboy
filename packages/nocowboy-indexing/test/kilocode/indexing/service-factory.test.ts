import { describe, expect, test, mock, beforeEach } from "bun:test"
import path from "path"
import ignore from "ignore"
import { mockEmbeddingsCreate, openAIMockFactory, setOpenAIConstructorHook } from "./embedders/__helpers__/openai-mock"

mock.module("openai", openAIMockFactory)
import { CodeIndexServiceFactory } from "../../../src/indexing/service-factory"
import { CodeIndexConfigManager } from "../../../src/indexing/config-manager"
import { CacheManager } from "../../../src/indexing/cache-manager"
import type { ICodeParser, IVectorStore } from "../../../src/indexing/interfaces"
import { BATCH_SEGMENT_THRESHOLD, LOCAL_EMBEDDER_BATCH_SEGMENT_THRESHOLD } from "../../../src/indexing/constants"

const workspacePath = "/tmp/ws"
const cacheDirectory = "/tmp/cache"

function createFactory(input?: Partial<ConstructorParameters<typeof CodeIndexConfigManager>[0]>) {
  const cfg = new CodeIndexConfigManager({
    enabled: true,
    embedderProvider: "openai",
    openAiKey: "sk-test",
    ...input,
  })

  const cache = {} as CacheManager

  return new CodeIndexServiceFactory(cfg, workspacePath, cache, cacheDirectory)
}

describe("CodeIndexServiceFactory", () => {
  beforeEach(() => {
    mockEmbeddingsCreate.mockReset()
    setOpenAIConstructorHook(undefined)
  })

  test("creates an OpenAI-compatible embedder without an API key", () => {
    const factory = createFactory({
      embedderProvider: "openai-compatible",
      openAiKey: undefined,
      openAiCompatibleBaseUrl: "http://localhost:1234/v1",
    })

    expect(factory.createEmbedder().embedderInfo).toEqual({ name: "openai-compatible" })
  })

  test("uses default LanceDB directory when config is unset", () => {
    const factory = createFactory({ vectorStoreProvider: "lancedb", lancedbVectorStoreDirectory: undefined })

    const store = factory.createVectorStore() as unknown as { dbPath: string }

    expect(store).toBeDefined()
    expect(store.dbPath).toContain(path.join(cacheDirectory, "lancedb"))
  })

  test("uses explicit LanceDB directory when configured", () => {
    const dir = "/tmp/custom-lancedb"
    const factory = createFactory({ vectorStoreProvider: "lancedb", lancedbVectorStoreDirectory: dir })

    const store = factory.createVectorStore() as unknown as { dbPath: string }

    expect(store.dbPath).toContain(dir)
  })

  test("passes configured dimension to Ollama embed requests", async () => {
    const fn = mock(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embeddings: [[0.1, 0.2]] }),
      } as Response),
    ) as unknown as typeof fetch
    const prev = global.fetch
    global.fetch = fn

    try {
      const factory = createFactory({
        embedderProvider: "ollama",
        openAiKey: undefined,
        ollamaBaseUrl: "http://localhost:11434",
        modelId: "mxbai-embed-large",
        modelDimension: 1024,
      })

      const embedder = factory.createEmbedder()
      await embedder.createEmbeddings(["hello"])

      const calls = (fn as unknown as { mock: { calls: Array<[string, RequestInit | undefined]> } }).mock.calls
      const req = calls[0]?.[1]
      if (!req || typeof req.body !== "string") throw new Error("Missing Ollama embed request body")
      const body = JSON.parse(req.body)

      expect(body.model).toBe("mxbai-embed-large")
      expect(body.input).toEqual(["hello"])
      expect(body.dimensions).toBe(1024)
    } finally {
      global.fetch = prev
    }
  })

  test("leaves Ollama dimensions unset when no override is configured", async () => {
    const fn = mock(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embeddings: [[0.1, 0.2]] }),
      } as Response),
    ) as unknown as typeof fetch
    const prev = global.fetch
    global.fetch = fn

    try {
      const factory = createFactory({
        embedderProvider: "ollama",
        openAiKey: undefined,
        ollamaBaseUrl: "http://localhost:11434",
        modelId: "mxbai-embed-large",
      })

      const embedder = factory.createEmbedder()
      await embedder.createEmbeddings(["hello"])

      const calls = (fn as unknown as { mock: { calls: Array<[string, RequestInit | undefined]> } }).mock.calls
      const req = calls[0]?.[1]
      if (!req || typeof req.body !== "string") throw new Error("Missing Ollama embed request body")
      const body = JSON.parse(req.body)

      expect(body.model).toBe("mxbai-embed-large")
      expect(body.input).toEqual(["hello"])
      expect("dimensions" in body).toBe(false)
    } finally {
      global.fetch = prev
    }
  })

  test("passes configured dimension to OpenRouter embed requests", async () => {
    const factory = createFactory({
      embedderProvider: "openrouter",
      openAiKey: undefined,
      openRouterApiKey: "or-test",
      modelId: "openai/text-embedding-3-small",
      modelDimension: 1024,
    })

    const testEmbedding = new Float32Array([0.25, 0.5])
    const base64String = Buffer.from(testEmbedding.buffer).toString("base64")

    mockEmbeddingsCreate.mockResolvedValue({
      data: [
        {
          embedding: base64String,
        },
      ],
      usage: {
        prompt_tokens: 1,
        total_tokens: 1,
      },
    })

    const embedder = factory.createEmbedder()

    await embedder.createEmbeddings(["hello"])

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      input: ["hello"],
      model: "openai/text-embedding-3-small",
      encoding_format: "float",
      dimensions: 1024,
    })
  })

  test("creates vector store for OpenRouter Gemini embedding preview", () => {
    const factory = createFactory({
      embedderProvider: "openrouter",
      openAiKey: undefined,
      openRouterApiKey: "or-test",
      modelId: "google/gemini-embedding-2-preview",
      vectorStoreProvider: "lancedb",
    })

    const store = factory.createVectorStore() as unknown as { vectorSize: number }

    expect(store).toBeDefined()
    expect(store.vectorSize).toBe(3072)
  })

  test("uses configured dimension before static model metadata for vector stores", () => {
    const factory = createFactory({
      embedderProvider: "openrouter",
      openAiKey: undefined,
      openRouterApiKey: "or-test",
      modelId: "openai/text-embedding-3-small",
      modelDimension: 1024,
      vectorStoreProvider: "lancedb",
    })

    const store = factory.createVectorStore() as unknown as { vectorSize: number }

    expect(store).toBeDefined()
    expect(store.vectorSize).toBe(1024)
  })

  test("creates Kilo embedder with Cloud-provided model", async () => {
    const factory = createFactory({
      embedderProvider: "kilo",
      openAiKey: undefined,
      kiloApiKey: "kilo-token",
      kiloOrganizationId: "org_123",
      modelId: "mistralai/mistral-embed-2312",
      modelDimension: 1024,
    })

    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2] }],
      usage: { prompt_tokens: 1, total_tokens: 1 },
    })

    const embedder = factory.createEmbedder()
    await embedder.createEmbeddings(["hello"])

    expect(embedder.embedderInfo).toEqual({ name: "kilo" })
    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      input: ["hello"],
      model: "mistralai/mistral-embed-2312",
      encoding_format: "base64",
      dimensions: 1024,
    })
  })

  test("gives local embedders a smaller default batch size than hosted ones", () => {
    // AC1: a local (CPU-only) embedder must never be asked for more than 24
    // segments per request — a measured 60-segment Ollama batch took ~104s
    // against a 120s budget, which made a slow-but-alive embedder look dead.
    expect(LOCAL_EMBEDDER_BATCH_SEGMENT_THRESHOLD).toBeLessThanOrEqual(24)
    expect(LOCAL_EMBEDDER_BATCH_SEGMENT_THRESHOLD).toBeLessThan(BATCH_SEGMENT_THRESHOLD)

    const local = createFactory({
      embedderProvider: "ollama",
      openAiKey: undefined,
      ollamaBaseUrl: "http://localhost:11434",
      modelId: "nomic-embed-text",
    })
    const hosted = createFactory({ embedderProvider: "openai", openAiKey: "sk-test" })
    const localScanner = local.createDirectoryScanner(
      local.createEmbedder(),
      {} as IVectorStore,
      {} as ICodeParser,
      ignore(),
    )
    const localWatcher = local.createFileWatcher(local.createEmbedder(), {} as IVectorStore, {} as CacheManager, ignore())
    const hostedScanner = hosted.createDirectoryScanner(
      hosted.createEmbedder(),
      {} as IVectorStore,
      {} as ICodeParser,
      ignore(),
    )

    expect((localScanner as unknown as { batchSegmentThreshold: number }).batchSegmentThreshold).toBe(
      LOCAL_EMBEDDER_BATCH_SEGMENT_THRESHOLD,
    )
    expect((localWatcher as unknown as { batchSegmentThreshold: number }).batchSegmentThreshold).toBe(
      LOCAL_EMBEDDER_BATCH_SEGMENT_THRESHOLD,
    )
    expect((hostedScanner as unknown as { batchSegmentThreshold: number }).batchSegmentThreshold).toBe(
      BATCH_SEGMENT_THRESHOLD,
    )
  })

  test("lets an explicit embeddingBatchSize win over the provider default", () => {
    const factory = createFactory({
      embedderProvider: "ollama",
      openAiKey: undefined,
      ollamaBaseUrl: "http://localhost:11434",
      modelId: "nomic-embed-text",
      embeddingBatchSize: 7,
    })

    const scanner = factory.createDirectoryScanner(
      factory.createEmbedder(),
      {} as IVectorStore,
      {} as ICodeParser,
      ignore(),
    )

    expect((scanner as unknown as { batchSegmentThreshold: number }).batchSegmentThreshold).toBe(7)
  })
})
