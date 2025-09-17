import { inject, Injectable } from '@angular/core';
import { DATA_SERVICE, IDataService } from '../../services/data/interfaces/i-data.service';
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';

export type SceneDocument = {
    id: string,
    name?: string,
    updatedAt: string
    elements: OrderedExcalidrawElement[],
    __etag?: number
};

export const COLLECTION = "excalidraw-scenes";

@Injectable({ providedIn: 'root' })
export class ExcalidrawScenesService {

    extensionDataService = inject<IDataService>(DATA_SERVICE);

    async loadScene(id: string): Promise<SceneDocument | undefined> {
        return this.extensionDataService.readDocument<SceneDocument>(COLLECTION, id);
    }

    async saveScene(payload: Omit<SceneDocument, "updatedAt">): Promise<SceneDocument | undefined> {
        const doc: SceneDocument = {
            ...payload,
            updatedAt: new Date().toISOString()
        };

        const updated = await this.extensionDataService.createOrUpdateDocument<SceneDocument>(COLLECTION, doc);
        return updated;
    }

}