import ConfigProvider from '@/components/ConfigProvider';
import UploadFile from '@/components/pages/upload/File';
import { prisma } from '@/lib/db';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { Anchor, Center, Container, Text } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';

export default function UploadToFolderId({
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
          <Center>
            <Text c='dimmed' ta='center'>
              {folder.public ? (
                <>
                  This folder is{' '}
                  <Anchor component={Link} href={`/folder/${folder.id}`}>
                    public
                  </Anchor>
                  . Anyone with the link can view its contents and upload files.
                </>
              ) : (
                "Only the owner can view this folder's contents. However, anyone can upload files, and they can still access their uploaded files if they have the link to the specific file."
              )}
            </Text>
          </Center>
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
      public: true,
    },
  });

  if (!folder) return { notFound: true };
  if (!folder.allowUploads) return { notFound: true };

  return {
    folder: cleanFolder(folder, true),
  };
});
