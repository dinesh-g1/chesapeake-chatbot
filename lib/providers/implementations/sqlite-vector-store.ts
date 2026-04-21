import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  VectorStore,
  VectorDocument,
  VectorSearchResult,
  VectorSearchOptions,
  VectorStoreOptions,
  DocumentMetadata,
} from "../../types";

interface DatabaseVector {
  id: string;
  content: string;
  metadata: string; // JSON string
  embedding: string; // JSON string of number[]
  created_at: string;
}

export class SQLiteVectorStore implements VectorStore {
  private db: Database.Database;
  private tableName: string;
  private dimension: number;

  constructor(config: any) {
    const connectionString =
      config.connectionString || "sqlite://./data/vector_store.db";
    // Extract path from connection string or use default
    let dbPath = "./data/vector_store.db";
    if (connectionString.startsWith("sqlite://")) {
      dbPath = connectionString.substring("sqlite://".length);
    }

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.tableName = config.tableName || "vectors";
    this.dimension = config.dimension || 1536;

    // Initialize database
    this.initialize();
  }

  async initialize(): Promise<void> {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        embedding TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on id for faster lookups
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_id ON ${this.tableName}(id)`,
    );
  }

  async addDocuments(
    documents: VectorDocument[],
    options?: VectorStoreOptions,
  ): Promise<void> {
    const batchSize = options?.batchSize || 100;
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.tableName} (id, content, metadata, embedding)
      VALUES (?, ?, ?, ?)
    `);

    // Process in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const transaction = this.db.transaction((docs: VectorDocument[]) => {
        for (const doc of docs) {
          insertStmt.run(
            doc.id,
            doc.content,
            JSON.stringify(doc.metadata),
            JSON.stringify(doc.embedding || []),
          );
        }
      });

      try {
        transaction(batch);
      } catch (error) {
        console.error(
          `Error adding documents batch ${i}-${i + batch.length}:`,
          error,
        );
        throw error;
      }
    }
  }

  async similaritySearch(
    query: string | number[],
    options?: VectorSearchOptions,
  ): Promise<VectorSearchResult[]> {
    const k = options?.k || 5;
    const scoreThreshold = options?.scoreThreshold || 0;
    const includeMetadata = options?.includeMetadata ?? true;
    const includeEmbedding = options?.includeEmbedding ?? false;

    // Convert query to vector if it's a string (for this demo, we'll assume it's already a vector)
    // In production, we'd call the embedding provider here
    let queryVector: number[];
    if (typeof query === "string") {
      // For simplicity, create a random vector - in real use, we'd embed the query
      queryVector = Array.from(
        { length: this.dimension },
        () => Math.random() * 2 - 1,
      );
    } else {
      queryVector = query;
    }

    // Normalize query vector
    const queryNorm = this.norm(queryVector);
    if (queryNorm === 0) {
      return [];
    }

    // Get all vectors from database
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName}`)
      .all() as DatabaseVector[];

    const results: VectorSearchResult[] = [];

    for (const row of rows) {
      try {
        const embedding = JSON.parse(row.embedding) as number[];

        // Skip if embedding dimension doesn't match
        if (embedding.length !== this.dimension) {
          continue;
        }

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(
          queryVector,
          embedding,
          queryNorm,
        );

        if (similarity >= scoreThreshold) {
          const metadata = JSON.parse(row.metadata) as DocumentMetadata;
          const document: VectorDocument = {
            id: row.id,
            content: row.content,
            metadata,
            embedding: includeEmbedding ? embedding : undefined,
          };

          results.push({
            document,
            score: similarity,
          });
        }
      } catch (error) {
        console.warn(`Error processing vector ${row.id}:`, error);
        continue;
      }
    }

    // Sort by score descending and return top k
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }

  async similaritySearchWithFilter(
    query: string | number[],
    filter: Record<string, any>,
    options?: VectorSearchOptions,
  ): Promise<VectorSearchResult[]> {
    // First get all results
    const allResults = await this.similaritySearch(query, {
      ...options,
      k: 100, // Get more results to filter
    });

    // Filter results based on metadata
    return allResults
      .filter((result) => {
        for (const [key, value] of Object.entries(filter)) {
          const metadataValue = result.document.metadata[key];

          // Handle different types of comparisons
          if (Array.isArray(value)) {
            // Check if metadata value is in array
            if (!value.includes(metadataValue)) {
              return false;
            }
          } else if (metadataValue !== value) {
            return false;
          }
        }
        return true;
      })
      .slice(0, options?.k || 5);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    const placeholders = ids.map(() => "?").join(",");
    const stmt = this.db.prepare(
      `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`,
    );
    stmt.run(...ids);
  }

  async getDocumentCount(): Promise<number> {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`)
      .get() as { count: number };
    return result.count;
  }

  async clear(): Promise<void> {
    this.db.prepare(`DELETE FROM ${this.tableName}`).run();
    this.db.prepare(`VACUUM`).run(); // Clean up database file
  }

  // Utility methods for vector operations
  private cosineSimilarity(a: number[], b: number[], aNorm?: number): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimension");
    }

    // Calculate dot product
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }

    // Calculate norms
    const normA = aNorm || this.norm(a);
    const normB = this.norm(b);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private norm(vector: number[]): number {
    let sum = 0;
    for (const value of vector) {
      sum += value * value;
    }
    return Math.sqrt(sum);
  }

  // Additional utility methods
  async getDocument(id: string): Promise<VectorDocument | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
      .get(id) as DatabaseVector | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      embedding: JSON.parse(row.embedding),
    };
  }

  async updateDocument(
    id: string,
    updates: Partial<VectorDocument>,
  ): Promise<void> {
    const existing = await this.getDocument(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    const updatedDoc = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
    };

    const stmt = this.db.prepare(`
      UPDATE ${this.tableName}
      SET content = ?, metadata = ?, embedding = ?
      WHERE id = ?
    `);

    stmt.run(
      updatedDoc.content,
      JSON.stringify(updatedDoc.metadata),
      JSON.stringify(updatedDoc.embedding || []),
      id,
    );
  }

  async searchByMetadata(
    filter: Record<string, any>,
    limit: number = 100,
  ): Promise<VectorDocument[]> {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName}`)
      .all() as DatabaseVector[];
    const results: VectorDocument[] = [];

    for (const row of rows) {
      try {
        const metadata = JSON.parse(row.metadata);
        let matches = true;

        for (const [key, value] of Object.entries(filter)) {
          if (metadata[key] !== value) {
            matches = false;
            break;
          }
        }

        if (matches) {
          results.push({
            id: row.id,
            content: row.content,
            metadata,
            embedding: JSON.parse(row.embedding),
          });

          if (results.length >= limit) {
            break;
          }
        }
      } catch (error) {
        console.warn(`Error parsing metadata for ${row.id}:`, error);
      }
    }

    return results;
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}
