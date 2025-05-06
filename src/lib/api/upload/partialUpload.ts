import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { guess } from '@/lib/mimes';
import { formatFileName } from '@/lib/uploader/formatFileName';
import { UploadHeaders, UploadOptions } from '@/lib/uploader/parseHeaders';
import { ApiUploadResponse, MultipartFileBuffer } from '@/server/routes/api/upload';
import { FastifyRequest } from 'fastify';
import { readdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { getExtension } from './upload';
import { randomCharacters } from '@/lib/random';
import { bytes } from '@/lib/bytes';

const partialsCache = new Map<string, { length: number; options: UploadOptions }>();

const logger = log('api').c('upload');
export async function handlePartialUpload({
  file,
  options,
  domain,
  response,
  req,
}: {
  file: MultipartFileBuffer;
  options: UploadOptions;
  domain: string;
  response: ApiUploadResponse;
  req: FastifyRequest<{ Headers: UploadHeaders }>;
}) {
  if (!options.partial) throw 'No partial upload options provided';
  logger.debug('partial upload detected', { partial: options.partial });

  if (!options.partial.range || options.partial.range.length !== 3) throw 'Invalid partial upload';

  if (options.partial.range[0] === 0) {
    const identifier = randomCharacters(8);
    partialsCache.set(identifier, { length: file.buffer.length, options });
    options.partial.identifier = identifier;
  } else {
    if (!options.partial.identifier || !partialsCache.has(options.partial.identifier))
      throw 'No partial upload identifier provided';
  }

  const cache = partialsCache.get(options.partial.identifier);
  if (!cache) throw 'No partial upload cache found';

  const prefix = `zipline_partial_${options.partial.identifier}_`;

  if (cache.length + file.buffer.length > bytes(config.files.maxFileSize)) {
    partialsCache.delete(options.partial.identifier);

    const tempFiles = await readdir(config.core.tempDirectory);
    await Promise.all(
      tempFiles.filter((f) => f.startsWith(prefix)).map((f) => rm(join(config.core.tempDirectory, f))),
    );

    throw 'File is too large';
  }

  cache.length += file.buffer.length;

  const extension = getExtension(options.partial.filename, options.overrides?.extension);

  if (config.files.disabledExtensions.includes(extension)) throw `File extension ${extension} is not allowed`;

  const format = options.format || config.files.defaultFormat;
  let fileName = formatFileName(format, decodeURIComponent(options.partial.filename));

  if (options.overrides?.filename || format === 'name') {
    if (options.overrides?.filename) fileName = decodeURIComponent(options.overrides!.filename!);
    const existing = await prisma.file.findFirst({
      where: {
        name: {
          startsWith: fileName,
        },
      },
    });

    const fileOverwrite = req.headers['x-zipline-file-overwrite'] === 'true'; // Check header value

    if (fileOverwrite && !config.files.fileOverwrite) {
      throw 'File overwrite is disabled in the configuration';
    }

    if (existing) {
      if (fileOverwrite && config.files.fileOverwrite) { // Both must be true
        // Delete the existing file
        await prisma.file.delete({
          where: {
            id: existing.id,
          },
        });
        logger.info(`Overwriting existing file: ${fileName}`);
      } else {
        throw `A file with the name "${fileName}*" already exists`;
      }
    }
  }

  let mimetype = options.partial.contentType;
  if (mimetype === 'application/octet-stream' && config.files.assumeMimetypes) {
    const mime = await guess(extension.substring(1));
    if (mime) mimetype = mime;
  }

  let folder = null;
  if (options.folder) {
    folder = await prisma.folder.findFirst({
      where: {
        id: options.folder,
      },
    });

    if (!folder) throw 'Folder does not exist';

    if (!folder.allowUploads && folder.userId !== req.user?.id) throw 'Folder is not open';
  }

  const tempFile = join(
    config.core.tempDirectory,
    `${prefix}${options.partial.range[0]}_${options.partial.range[1]}`,
  );
  await writeFile(tempFile, file.buffer);

  if (options.partial.lastchunk) {
    const fileUpload = await prisma.file.create({
      data: {
        name: `${fileName}${extension}`,
        size: 0,
        type: mimetype,
        User: {
          connect: {
            id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
          },
        },
        ...(options.password && { password: await hashPassword(options.password) }),
        ...(options.folder && { Folder: { connect: { id: options.folder } } }),
        ...(options.addOriginalName && {
          originalName: options.partial.filename
            ? decodeURIComponent(options.partial.filename)
            : file.filename,
        }),
      },
    });

    new Worker('./build/offload/partial.js', {
      workerData: {
        user: {
          id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
        },
        file: {
          id: fileUpload.id,
          filename: fileUpload.name,
          type: fileUpload.type,
        },
        options,
        domain,
        responseUrl: `${domain}/${encodeURIComponent(fileUpload.name)}`,
      },
    });

    response.files.push({
      id: fileUpload.id,
      type: fileUpload.type,
      url: `${domain}/${encodeURIComponent(fileUpload.name)}`,
      pending: true,
    });

    partialsCache.delete(options.partial.identifier);
  }

  response.partialSuccess = true;
  if (options.partial.range[0] === 0) {
    response.partialIdentifier = options.partial.identifier;
  }
}
