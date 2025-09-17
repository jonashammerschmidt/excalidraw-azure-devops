import { inject, Injectable } from '@angular/core';
import { DATA_SERVICE, IDataService } from '../../services/data/interfaces/i-data.service';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

export type SceneMeta = {
  id: string;
  name: string;
  updatedAt: string;
  __etag: number;
};

export type SceneElementsDoc = {
  id: string;
  elements: OrderedExcalidrawElement[];
  __etag: number;
};

export type SceneDocument = SceneMeta & { elements: OrderedExcalidrawElement[] }; // convenience shape

export const META_COLLECTION = 'excalidraw-scenes';
export const ELEMENTS_COLLECTION = 'excalidraw-scene-elements';

@Injectable({ providedIn: 'root' })
export class ExcalidrawScenesService {
  private readonly dataService = inject<IDataService>(DATA_SERVICE);

  public async listScenes(): Promise<SceneMeta[]> {
    return await this.dataService.readDocuments<SceneMeta>(META_COLLECTION);
  }

  public async loadScene(id: string): Promise<SceneDocument | undefined> {
    const meta = await this.loadSceneMeta(id);
    if (!meta) return undefined;

    const elementsDoc = await this.loadSceneElements(id);
    const elements = elementsDoc?.elements ?? [];
    return { ...meta, elements };
  }

  public async saveScene(payload: Omit<SceneDocument, 'updatedAt'>): Promise<SceneMeta | undefined> {
    const { id, name, elements, __etag } = payload;

    await this.saveSceneElements({ id, elements, __etag });

    const meta: SceneMeta = {
      id,
      name,
      updatedAt: new Date().toISOString(),
      __etag
    };

    const updatedMeta = await this.dataService.createOrUpdateDocument<SceneMeta>(META_COLLECTION, meta);
    return updatedMeta;
  }

  public async deleteScene(sceneId: string): Promise<void> {
    await this.dataService.deleteDocument(META_COLLECTION, sceneId);
    await this.dataService.deleteDocument(ELEMENTS_COLLECTION, sceneId);
  }

  public async loadSceneMeta(id: string): Promise<SceneMeta | undefined> {
    return await this.dataService.readDocument<SceneMeta>(META_COLLECTION, id);
  }

  public async loadSceneElements(sceneId: string): Promise<SceneElementsDoc | undefined> {
    return await this.dataService.readDocument<SceneElementsDoc>(ELEMENTS_COLLECTION, sceneId);
  }

  private async saveSceneElements(doc: SceneElementsDoc): Promise<SceneElementsDoc | undefined> {
    return await this.dataService.createOrUpdateDocument<SceneElementsDoc>(ELEMENTS_COLLECTION, doc);
  }
}