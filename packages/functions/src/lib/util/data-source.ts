import { indexOperations } from '@revelationsai/core/database/schema';
import type { DataSource } from '@revelationsai/core/model/data-source';
import { and, eq } from 'drizzle-orm';
import { indexRemoteFile } from '../scraper/file';
import { indexWebCrawl } from '../scraper/web-crawl';
import { indexWebPage } from '../scraper/webpage';
import { indexYoutubeVideo } from '../scraper/youtube';
import { dataSourceService, indexOperationService, vectorDatabaseService } from '../services';

export async function syncDataSource(id: string, manual: boolean = false): Promise<DataSource> {
  let dataSource = await dataSourceService.getDataSourceOrThrow(id);

  const runningIndexOps = await indexOperationService.getIndexOperations({
    where: and(
      eq(indexOperations.dataSourceId, dataSource.id),
      eq(indexOperations.status, 'RUNNING')
    ),
    limit: 1
  });
  if (runningIndexOps.length > 0) {
    throw new Error(`Cannot sync data source ${dataSource.id} because it is already being indexed`);
  }

  dataSource = await dataSourceService.updateDataSource(dataSource.id, {
    numberOfDocuments: 0
  });

  const syncDate = new Date();

  switch (dataSource.type) {
    case 'FILE':
      throw new Error('You must upload a file to the data source to index it');
    case 'REMOTE_FILE':
      await indexRemoteFile({
        dataSourceId: dataSource.id,
        name: dataSource.name,
        url: dataSource.url,
        metadata: dataSource.metadata
      });
      break;
    case 'WEBPAGE':
      await indexWebPage({
        dataSourceId: dataSource.id,
        name: dataSource.name,
        url: dataSource.url,
        metadata: dataSource.metadata
      });
      break;
    case 'WEB_CRAWL':
      await indexWebCrawl({
        dataSourceId: dataSource.id,
        name: dataSource.name,
        url: dataSource.url,
        pathRegex: dataSource.metadata.pathRegex,
        metadata: dataSource.metadata
      });
      break;
    case 'YOUTUBE':
      await indexYoutubeVideo({
        dataSourceId: dataSource.id,
        name: dataSource.name,
        url: dataSource.url,
        metadata: dataSource.metadata
      });
      break;
    default:
      throw new Error(`Unsupported data source type ${dataSource.type}`);
  }

  dataSource = await dataSourceService.updateDataSource(dataSource.id, {
    lastManualSync: manual ? syncDate : undefined,
    lastAutomaticSync: !manual ? syncDate : undefined
  });

  // Delete old vectors
  const vectorDb = await vectorDatabaseService.getDocumentVectorStore();
  await vectorDb.transaction(async (client) => {
    return await client.query(
      `DELETE FROM ${vectorDb.tableName} 
      WHERE (
        metadata->>'dataSourceId' = $1
        AND
        metadata->>'indexDate' < $2
      );`,
      [dataSource.id, syncDate]
    );
  });

  return dataSource;
}
