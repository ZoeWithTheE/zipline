import ConfigProvider from '@/components/ConfigProvider';
import UploadFile from '@/components/pages/upload/File';
import { prisma } from '@/lib/db';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { Container } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';
import Head from 'next/head';

export default function ViewFolderId({
  folder,
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!folder) return null;

  return (
    <>
      <Head>
        <title>{`${config.website.title ?? 'Zipline'} – Upload to ${folder.name}`}</title>
      </Head>

      <Container mt='lg'>
        <ConfigProvider config={config}>
          <UploadFile title={`Upload files to ${folder.name}`} folder={folder.id} />
        </ConfigProvider>
      </Container>
    </>
  );
}

export const getServerSideProps = withSafeConfig<{
  folder?: Partial<Folder>;
}>(async (ctx) => {
  const { id } = ctx.query;
  if (!id) return { notFound: true };

  const folder = await prisma.folder.findUnique({
    where: {
      id: id as string,
    },
    select: {
      id: true,
      name: true,
      allowUploads: true,
    },
  });

  if (!folder) return { notFound: true };
  if (!folder.allowUploads) return { notFound: true };

  return {
    folder: cleanFolder(folder, true),
  };
});
