import { inject, Injectable } from '@angular/core';
import { DATA_SERVICE, IDataService, VersionMismatchError } from '../../services/data/interfaces/i-data.service';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { ProjectService } from '../../services/project/project.service';
import { LoggingService } from '../../services/logging/logging.service';

export type SceneMeta = {
  id: string;
  name: string;
  updatedAt: string;
  projectId: string;
  __etag: number;
};

export type SceneElementsDoc = {
  id: string;
  elements: OrderedExcalidrawElement[];
  __etag: number;
};

export type SceneDocument = SceneMeta & { elements: OrderedExcalidrawElement[] };
export type SceneDocumentForUpdate = Omit<SceneDocument, 'updatedAt' | 'projectId'>;

export const META_COLLECTION = 'excalidraw-scenes';
export const ELEMENTS_COLLECTION = 'excalidraw-scene-elements';

export function getDefaultSceneDocument(drawingId: string): SceneDocument {
  return {
    id: drawingId,
    name: 'nameless',
    updatedAt: new Date().toISOString(),
    projectId: 'undefined',
    elements: [],
    __etag: 0
  };
}

@Injectable({ providedIn: 'root' })
export class ExcalidrawScenesService {
  private readonly dataService = inject<IDataService>(DATA_SERVICE);
  private readonly projectService = inject(ProjectService);
  private readonly loggingService = inject(LoggingService);

  public async listScenes(): Promise<SceneMeta[]> {
    const projectId = await this.projectService.getCurrectProjectId();
    const scenes = await this.dataService.readDocuments<SceneMeta>(META_COLLECTION);

    return scenes
      .filter(scene => scene.projectId === undefined || scene.projectId === projectId);;
  }

  public async loadScene(sceneId: string): Promise<SceneDocument | undefined> {
    const projectId = await this.projectService.getCurrectProjectId();

    const meta = await this.loadSceneMeta(sceneId);
    if (!meta || (meta.projectId != undefined && meta.projectId !== projectId)) return undefined;

    const elementsDoc = await this.loadSceneElements(sceneId);
    const elements = elementsDoc?.elements ?? [];
    return { ...meta, elements };
  }

  public async saveScene(sceneDocumentForUpdate: SceneDocumentForUpdate): Promise<SceneDocument> {
    const { id, name, elements, __etag } = sceneDocumentForUpdate;
    this.loggingService.debug('ExcalidrawScenesService', 'saveScene called', {
      id,
      name,
      elementCount: elements.filter(element => !element.isDeleted).length,
      etag: __etag,
    });

    await this.saveSceneElementsWithRecovery({ id, elements, __etag });

    const meta: SceneMeta = {
      id,
      name,
      updatedAt: new Date().toISOString(),
      projectId: await this.projectService.getCurrectProjectId(),
      __etag
    };

    this.loggingService.debug('ExcalidrawScenesService', 'Saving scene meta', {
      id: meta.id,
      projectId: meta.projectId,
      etag: meta.__etag,
    });
    await this.dataService.createOrUpdateDocument<SceneMeta>(META_COLLECTION, meta);
    meta.__etag++;
    this.loggingService.debug('ExcalidrawScenesService', 'saveScene finished', {
      id: meta.id,
      nextEtag: meta.__etag,
      elementCount: elements.filter(element => !element.isDeleted).length,
    });
    return { ...meta, elements };
  }

  public async deleteScene(sceneId: string): Promise<void> {
    const projectId = await this.projectService.getCurrectProjectId();
    const meta = await this.loadSceneMeta(sceneId);
    if (!meta || meta.projectId !== projectId) return undefined;

    await this.dataService.deleteDocument(META_COLLECTION, sceneId);
    await this.dataService.deleteDocument(ELEMENTS_COLLECTION, sceneId);
  }

  private async loadSceneMeta(sceneId: string): Promise<SceneMeta | undefined> {
    return await this.dataService.readDocument<SceneMeta>(META_COLLECTION, sceneId);
  }

  private async loadSceneElements(sceneId: string): Promise<SceneElementsDoc | undefined> {
    return await this.dataService.readDocument<SceneElementsDoc>(ELEMENTS_COLLECTION, sceneId);
  }

  private async saveSceneElements(doc: SceneElementsDoc): Promise<SceneElementsDoc | undefined> {
    this.loggingService.debug('ExcalidrawScenesService', 'Saving scene elements', {
      id: doc.id,
      etag: doc.__etag,
      elementCount: doc.elements.filter(element => !element.isDeleted).length,
    });
    return await this.dataService.createOrUpdateDocument<SceneElementsDoc>(ELEMENTS_COLLECTION, doc);
  }

  private async saveSceneElementsWithRecovery(doc: SceneElementsDoc): Promise<SceneElementsDoc | undefined> {
    try {
      return await this.saveSceneElements(doc);
    } catch (error) {
      this.loggingService.debug('ExcalidrawScenesService', 'Saving scene elements failed', {
        id: doc.id,
        etag: doc.__etag,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      if (!(error instanceof VersionMismatchError)) {
        throw error;
      }

      // Recover from partial saves where elements/__etag advanced but meta/__etag did not.
      const [latestMeta, latestElements] = await Promise.all([
        this.loadSceneMeta(doc.id),
        this.loadSceneElements(doc.id),
      ]);

      const hasRealConflict = latestMeta?.__etag !== undefined && latestMeta.__etag !== doc.__etag;
      this.loggingService.debug('ExcalidrawScenesService', 'Version mismatch recovery state loaded', {
        id: doc.id,
        requestedEtag: doc.__etag,
        latestMetaEtag: latestMeta?.__etag ?? null,
        latestElementsEtag: latestElements?.__etag ?? null,
        hasRealConflict,
      });

      if (hasRealConflict) {
        this.loggingService.debug('ExcalidrawScenesService', 'Version mismatch is a real conflict', {
          id: doc.id,
          requestedEtag: doc.__etag,
          latestMetaEtag: latestMeta?.__etag ?? null,
        });
        throw error;
      }

      const recoveredDoc = {
        ...doc,
        __etag: latestElements?.__etag ?? doc.__etag,
      };
      this.loggingService.debug('ExcalidrawScenesService', 'Retrying scene elements save with recovered etag', {
        id: recoveredDoc.id,
        previousEtag: doc.__etag,
        retryEtag: recoveredDoc.__etag,
      });

      return await this.saveSceneElements(recoveredDoc);
    }
  }
}
