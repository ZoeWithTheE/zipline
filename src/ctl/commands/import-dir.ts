import { guess } from '@/lib/mimes';
import { statSync } from 'fs';
import { readFile, readdir } from 'fs/promises';
import { join, parse, resolve } from 'path';
import { reloadSettings } from '@/lib/config';
import { bytes } from '@/lib/bytes';

export async function importDir(
  directory: string,
  { id, folder, skipDb }: { id?: string; folder?: string; skipDb?: boolean },
) {
  const fullPath = resolve(directory);
  if (!statSync(fullPath).isDirectory()) return console.error('Not a directory:', directory);

  await reloadSettings();

  const { prisma } = await import('@/lib/db/index.js');
  let userId: string;

  if (id) {
    userId = id;
  } else {
    const user = await prisma.user.findFirst({
      where: { username: 'administrator', role: 'SUPERADMIN' },
    });

    if (!user) {
      const firstSuperAdmin = await prisma.user.findFirst({
        where: {
          role: 'SUPERADMIN',
        },
      });

      if (!firstSuperAdmin) return console.error('No superadmin found or "administrator" user.');

      userId = firstSuperAdmin.id;

      console.log('No "administrator" found, using', firstSuperAdmin.username);
    } else {
      userId = user.id;
    }
  }

  if (folder) {
    const exists = await prisma.folder.findFirst({
      where: {
        id: folder,
        userId,
      },
    });

    if (!exists) return console.error('Folder not found:', folder);
  }

  const files = await readdir(fullPath);
  const data = [];

  for (let i = 0; i !== files.length; ++i) {
    const info = parse(files[i]);
    const mime = await guess(info.ext.replace('.', ''));
    const { size } = statSync(join(fullPath, files[i]));

    data[i] = {
      name: info.base,
      type: mime,
      size,
      userId,
      ...(folder ? { folderId: folder } : {}),
    };
  }

  if (!skipDb) {
    const { count } = await prisma.file.createMany({
      data,
    });
    console.log(`Inserted ${count} files into the database.`);
  }

  const totalSize = data.reduce((acc, file) => acc + file.size, 0);
  let completed = 0;

  const { datasource } = await import('@/lib/datasource/index.js');
  for (let i = 0; i !== files.length; ++i) {
    console.log(`Uploading ${data[i].name} (${bytes(data[i].size)})...`);

    const start = process.hrtime();

    const buff = await readFile(join(fullPath, files[i]));
    await datasource.put(data[i].name, buff);

    const diff = process.hrtime(start);

    const time = diff[0] * 1e9 + diff[1];
    const timeStr = time > 1e9 ? `${(time / 1e9).toFixed(2)}s` : `${(time / 1e6).toFixed(2)}ms`;

    const uploadSpeed = (data[i].size / time) * 1e9;
    const uploadSpeedStr =
      uploadSpeed > 1e9 ? `${(uploadSpeed / 1e9).toFixed(2)} GB/s` : `${(uploadSpeed / 1e6).toFixed(2)} MB/s`;

    completed += data[i].size;

    console.log(
      `Uploaded ${data[i].name} in ${timeStr} (${bytes(data[i].size)}) ${i + 1}/${files.length} ${bytes(completed)}/${bytes(totalSize)} ${uploadSpeedStr}`,
    );
  }

  console.log('Done importing files.');
}
