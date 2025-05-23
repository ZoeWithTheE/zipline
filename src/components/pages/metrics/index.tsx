import { Box, Button, Group, Modal, Paper, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCalendarSearch, IconCalendarTime } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import FilesUrlsCountGraph from './parts/FilesUrlsCountGraph';
import { useApiStats } from './useStats';
import { StatsCardsSkeleton } from './parts/StatsCards';
import { StatsTablesSkeleton } from './parts/StatsTables';

const StatsCards = dynamic(() => import('./parts/StatsCards'));
const StatsTables = dynamic(() => import('./parts/StatsTables'));
const StorageGraph = dynamic(() => import('./parts/StorageGraph'));
const ViewsGraph = dynamic(() => import('./parts/ViewsGraph'));

export default function DashboardMetrics() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 86400000 * 7),
    new Date(),
  ]); // default: [7 days ago, now]

  const [open, setOpen] = useState(false);
  const [allTime, setAllTime] = useState(false);

  const { data, isLoading } = useApiStats({
    from: dateRange[0]?.toISOString() ?? undefined,
    to: dateRange[1]?.toISOString() ?? undefined,
    all: allTime,
  });

  const handleDateChange = (value: [Date | null, Date | null]) => {
    setAllTime(false);
    setDateRange(value);
  };

  useEffect(() => {
    if (allTime) setDateRange([null, null]);
  }, [allTime]);

  return (
    <>
      <Modal title='Change range' opened={open} onClose={() => setOpen(false)} size='auto'>
        <Paper withBorder>
          <DatePicker
            type='range'
            value={dateRange}
            onChange={handleDateChange}
            allowSingleDateInRange={false}
            maxDate={new Date(Date.now() + 0)}
          />
        </Paper>

        <Group mt='md'>
          <Button fullWidth onClick={() => setOpen(false)}>
            Close
          </Button>
        </Group>
      </Modal>

      <Group>
        <Title>Metrics</Title>
        <Button
          size='compact-sm'
          variant='outline'
          leftSection={<IconCalendarSearch size='1rem' />}
          onClick={() => setOpen(true)}
        >
          Change Date Range
        </Button>
        {!allTime ? (
          <Text size='sm' c='dimmed'>
            {data?.length ? (
              <>
                {new Date(data?.[0]?.createdAt).toLocaleDateString()}
                {' to '}
                {new Date(data?.[data.length - 1]?.createdAt).toLocaleDateString()}
              </>
            ) : (
              <>
                {dateRange[0]?.toLocaleDateString()}{' '}
                {dateRange[1] ? `to ${dateRange[1]?.toLocaleDateString()}` : ''}
              </>
            )}
          </Text>
        ) : (
          <Text size='sm' c='dimmed'>
            All Time
          </Text>
        )}
        {/* <Tooltip label='This may take longer than usual to load.'> */}
        <Tooltip
          label={!allTime ? 'This may take longer than usual to load.' : 'You are viewing all time stats.'}
        >
          <Button
            size='compact-sm'
            variant='outline'
            leftSection={<IconCalendarTime size='1rem' />}
            onClick={() => setAllTime(true)}
            disabled={allTime}
          >
            Show All Time
          </Button>
        </Tooltip>
      </Group>

      <Box pos='relative' mih={300} my='sm'>
        {isLoading ? (
          <div>
            <StatsCardsSkeleton />

            <StatsTablesSkeleton />
          </div>
        ) : data?.length ? (
          <div>
            <StatsCards data={data!} />

            <StatsTables data={data!} />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }}>
              <FilesUrlsCountGraph metrics={data!} />
              <ViewsGraph metrics={data!} />
            </SimpleGrid>

            <div>
              <StorageGraph metrics={data!} />
            </div>
          </div>
        ) : (
          <Text size='sm' c='red'>
            Failed to load statistics for this time range. There may be no data available within the time
            range specified. :(
          </Text>
        )}
      </Box>
    </>
  );
}
