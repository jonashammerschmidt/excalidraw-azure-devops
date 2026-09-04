import { SceneMeta } from '../../model/excalidraw-scenes/excalidraw-scenes.service';
import { createDrawingTree, flattenDrawingTree, moveFolderPath, normalizeFolderPath } from './drawings.page';

describe('drawing tree helpers', () => {
  const drawing = (id: string, name: string, folderPath?: string, updatedAt = '2026-01-01T00:00:00.000Z'): SceneMeta => ({
    id, name, folderPath, updatedAt, projectId: 'project', __etag: 1,
  });

  it('normalizes folder paths and keeps an empty path undefined', () => {
    expect(normalizeFolderPath(' Architecture / Backend // API ')).toBe('Architecture/Backend/API');
    expect(normalizeFolderPath(' / ')).toBeUndefined();
  });

  it('creates shared, nested folders while retaining root drawings', () => {
    const tree = createDrawingTree([
      drawing('root', 'Root drawing'),
      drawing('api', 'API', 'Architecture/Backend'),
      drawing('ui', 'UI', 'Architecture/Frontend'),
    ]);

    expect(tree.drawings.map(item => item.id)).toEqual(['root']);
    expect(tree.folders[0].name).toBe('Architecture');
    expect(tree.folders[0].folders.map(folder => folder.name)).toEqual(['Backend', 'Frontend']);
    expect(tree.folders[0].folders[0].drawings.map(item => item.id)).toEqual(['api']);
  });

  it('shows only expanded descendants, with folders before drawings', () => {
    const tree = createDrawingTree([
      drawing('root', 'Root drawing'),
      drawing('backend', 'Backend drawing', 'Architecture/Backend'),
    ]);

    const collapsed = flattenDrawingTree(tree, new Set(), { column: 'name', direction: 'asc' });
    expect(collapsed.map(entry => entry.kind === 'folder' ? `folder:${entry.folder.path}` : `drawing:${entry.drawing.id}`))
      .toEqual(['folder:Architecture', 'drawing:root']);

    const expanded = flattenDrawingTree(tree, new Set(['Architecture', 'Architecture/Backend']), { column: 'name', direction: 'asc' });
    expect(expanded.map(entry => entry.kind === 'folder' ? `folder:${entry.folder.path}` : `drawing:${entry.drawing.id}`))
      .toEqual(['folder:Architecture', 'folder:Architecture/Backend', 'drawing:backend', 'drawing:root']);
  });

  it('sorts drawings according to the selected header while folders stay alphabetical', () => {
    const tree = createDrawingTree([
      drawing('z', 'Zulu', undefined, '2026-01-02T00:00:00.000Z'),
      drawing('a', 'Alpha', undefined, '2026-01-01T00:00:00.000Z'),
      drawing('z-folder', 'Z folder', 'Zulu'),
      drawing('a-folder', 'A folder', 'Alpha'),
    ]);

    const entries = flattenDrawingTree(tree, new Set(), { column: 'updatedAt', direction: 'desc' });
    expect(entries.map(entry => entry.kind === 'folder' ? `folder:${entry.folder.name}` : `drawing:${entry.drawing.name}`))
      .toEqual(['folder:Alpha', 'folder:Zulu', 'drawing:Zulu', 'drawing:Alpha']);
  });

  it('sorts drawing and folder names naturally', () => {
    const tree = createDrawingTree([
      drawing('ten', 'Drawing 10'),
      drawing('two', 'Drawing 2'),
      drawing('one', 'Drawing 1'),
      drawing('folder-ten', 'In folder 10', 'Folder 10'),
      drawing('folder-two', 'In folder 2', 'Folder 2'),
    ]);

    const entries = flattenDrawingTree(tree, new Set(), { column: 'name', direction: 'asc' });

    expect(entries.map(entry => entry.kind === 'folder' ? `folder:${entry.folder.name}` : `drawing:${entry.drawing.name}`))
      .toEqual(['folder:Folder 2', 'folder:Folder 10', 'drawing:Drawing 1', 'drawing:Drawing 2', 'drawing:Drawing 10']);
  });

  it('moves a folder path while retaining the relative paths of its descendants', () => {
    expect(moveFolderPath('Architecture', 'Product/Architecture', 'Architecture/Backend'))
      .toBe('Product/Architecture/Backend');
    expect(moveFolderPath('Architecture', 'Product/Architecture', 'Other'))
      .toBe('Other');
  });
});
