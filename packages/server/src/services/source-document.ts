import {
  aiResponsesToSourceDocuments,
  devotionsToSourceDocuments
} from '@revelationsai/core/database/schema';
import { asc, eq } from 'drizzle-orm';
import type { RAIDatabase } from '../lib/database/config';
import type { DatabaseConfig } from './types';
import type { VectorDatabaseService } from './vector-db';

export class SourceDocumentService {
  private readonly db: RAIDatabase;
  private readonly vectorDatabaseService: VectorDatabaseService;

  constructor(
    config: DatabaseConfig & {
      vectorDatabaseService: VectorDatabaseService;
    }
  ) {
    this.db = config.db;
    this.vectorDatabaseService = config.vectorDatabaseService;
  }

  async getDevotionSourceDocuments(devotionId: string) {
    const sourceDocumentRelationships = await this.db
      .select()
      .from(devotionsToSourceDocuments)
      .where(eq(devotionsToSourceDocuments.devotionId, devotionId))
      .orderBy(asc(devotionsToSourceDocuments.distance));

    const vectorStore = await this.vectorDatabaseService.getDocumentVectorStore();
    const foundSourceDocuments = await vectorStore.getDocumentsByIds(
      sourceDocumentRelationships.map((d) => d.sourceDocumentId)
    );

    return foundSourceDocuments.map((d) => {
      const relationship = sourceDocumentRelationships.find((d2) => d2.devotionId === d.id);
      return {
        ...d,
        distance: relationship?.distance ?? 0,
        distanceMetric: relationship?.distanceMetric ?? 'cosine'
      };
    });
  }

  async getAiResponseSourceDocuments(aiResponseId: string) {
    const sourceDocumentRelationships = await this.db
      .select()
      .from(aiResponsesToSourceDocuments)
      .where(eq(aiResponsesToSourceDocuments.aiResponseId, aiResponseId))
      .orderBy(asc(aiResponsesToSourceDocuments.distance));

    const vectorStore = await this.vectorDatabaseService.getDocumentVectorStore();
    const foundSourceDocuments = await vectorStore.getDocumentsByIds(
      sourceDocumentRelationships.map((r) => r.sourceDocumentId)
    );

    return foundSourceDocuments.map((d) => {
      const relationship = sourceDocumentRelationships.find((r) => r.sourceDocumentId === d.id);
      return {
        ...d,
        distance: relationship?.distance ?? 0,
        distanceMetric: relationship?.distanceMetric ?? 'cosine'
      };
    });
  }
}
