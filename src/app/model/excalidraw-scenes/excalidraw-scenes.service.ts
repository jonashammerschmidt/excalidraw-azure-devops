import { inject, Injectable } from '@angular/core';
import { DATA_SERVICE, IDataService } from '../../services/data/interfaces/i-data.service';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { ProjectService } from '../../services/project/project.service';

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

    await this.saveSceneElements({ id, elements, __etag });

    const meta: SceneMeta = {
      id,
      name,
      updatedAt: new Date().toISOString(),
      projectId: await this.projectService.getCurrectProjectId(),
      __etag
    };

    await this.dataService.createOrUpdateDocument<SceneMeta>(META_COLLECTION, meta);
    meta.__etag++;
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
    return await this.dataService.createOrUpdateDocument<SceneElementsDoc>(ELEMENTS_COLLECTION, doc);
  }
}