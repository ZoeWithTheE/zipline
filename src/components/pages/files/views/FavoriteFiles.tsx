import {
  Accordion,
  Button,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Title,
} from '@mantine/core';
import { IconFileUpload, IconFilesOff } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useApiPagination } from '../useApiPagination';

const DashboardFile = dynamic(() => import('@/components/file/DashboardFile'), {
  loading: () => <Skeleton height={350} animate />,
});

export default function FavoriteFiles() {
  const [page, setPage] = useQueryState('fpage', parseAsInteger.withDefault(1));

  const { data, isLoading } = useApiPagination({
    page,
    favorite: true,
    filter: 'dashboard',
  });

  if (!isLoading && !data?.page.length) {
    return null;
  }

  return (
    <Accordion variant='separated' my='xs'>
      <Accordion.Item value='favorite'>
        <Accordion.Control>Favorite Files</Accordion.Control>

        <Accordion.Panel>
          <SimpleGrid
            my='sm'
            cols={{
              base: 1,
              md: 2,
              lg: (data?.page.length ?? 0 > 0) ? 3 : 1,
            }}
            spacing='md'
            pos='relative'
          >
            {isLoading ? (
              <Paper withBorder h={200}>
                <LoadingOverlay visible />
              </Paper>
            ) : (data?.page.length ?? 0 > 0) ? (
              data?.page.map((file) => <DashboardFile key={file.id} file={file} />)
            ) : (
              <Paper withBorder p='sm'>
                <Center>
                  <Stack>
                    <Group>
                      <IconFilesOff size='2rem' />
                      <Title order={2}>No files found</Title>
                    </Group>
                    <Button
                      variant='outline'
                      size='compact-sm'
                      leftSection={<IconFileUpload size='1rem' />}
                      component={Link}
                      href='/dashboard/upload/file'
                    >
                      Upload a file
                    </Button>
                  </Stack>
                </Center>
              </Paper>
            )}
          </SimpleGrid>

          <Center>
            <Pagination my='sm' value={page} onChange={setPage} total={data?.pages ?? 1} />
          </Center>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
