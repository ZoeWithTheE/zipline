import DashboardFile from '@/components/file/DashboardFile';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { ActionIcon, Container, Group, SimpleGrid, Title } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';
import { InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';

export default function ViewFolderId({
  folder,
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!folder) return null;

  return (
    <>
      <Head>
        <title>{`${config.website.title ?? 'Zipline'} – ${folder.name}`}</title>
      </Head>
      <Container>
        <Group>
          <Title order={1}>{folder.name}</Title>

          {folder.allowUploads && (
            <Link href={`/folder/${folder.id}/upload`}>
              <ActionIcon variant='outline'>
                <IconUpload size='1rem' />
              </ActionIcon>
            </Link>
          )}
        </Group>

        <SimpleGrid
          my='sm'
          cols={{
            base: 1,
            lg: 3,
            md: 2,
          }}
          spacing='md'
        >
          {folder.files?.map((file) => <DashboardFile key={file.id} file={file} reduce />)}
        </SimpleGrid>
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
    include: {
      files: {
        select: {
          ...fileSelect,
          password: true,
          tags: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
  if (!folder) return { notFound: true };
  if (!folder.public) return { notFound: true };

  return {
    folder: cleanFolder(folder, true),
  };
});
