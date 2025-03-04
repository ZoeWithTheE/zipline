import type { Folder as PrismaFolder } from '@prisma/client';
import { File, cleanFiles } from './file';

export type Folder = PrismaFolder & {
  files?: File[];
};

export function cleanFolder(folder: Partial<Folder>, stringifyDates = false) {
  if (folder.files) cleanFiles(folder.files, stringifyDates);

  if (folder.createdAt)
    (folder as any).createdAt = stringifyDates ? folder.createdAt.toISOString() : folder.createdAt;
  if (folder.updatedAt)
    (folder as any).updatedAt = stringifyDates ? folder.updatedAt.toISOString() : folder.updatedAt;

  return folder;
}

export function cleanFolders(folders: Folder[]) {
  for (let i = 0; i !== folders.length; ++i) {
    const folder = folders[i];

    if (folder.files) cleanFiles(folder.files);
  }

  return folders;
}
