import { useConfig } from '@/components/ConfigProvider';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import {
  ActionIcon,
  Button,
  Collapse,
  Grid,
  Group,
  Kbd,
  Paper,
  Progress,
  Text,
  Title,
  Tooltip,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useClipboard, useColorScheme } from '@mantine/hooks';
import { notifications, showNotification } from '@mantine/notifications';
import { IconDeviceSdCard, IconFiles, IconUpload, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import UploadOptionsButton from '../UploadOptionsButton';
import { uploadFiles } from '../uploadFiles';
import ToUploadFile from './ToUploadFile';
import { bytes } from '@/lib/bytes';
import { uploadPartialFiles } from '../uploadPartialFiles';
import { humanizeDuration } from '@/lib/relativeTime';
import { useShallow } from 'zustand/shallow';

export default function UploadFile({ title, folder }: { title?: string; folder?: string }) {
  const theme = useMantineTheme();
  const colorScheme = useColorScheme();
  const clipboard = useClipboard();
  const config = useConfig();

  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );

  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ percent: number; remaining: number; speed: number }>({
    percent: 0,
    remaining: 0,
    speed: 0,
  });
  const [dropLoading, setLoading] = useState(false);

  const handlePaste = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;

    for (let i = 0; i !== e.clipboardData.items.length; ++i) {
      if (!e.clipboardData.items[i].type.startsWith('image')) return;

      const blob = e.clipboardData.items[i].getAsFile();
      if (!blob) return;

      setFiles([...files, blob]);
      showNotification({
        message: `Image ${blob.name} pasted from clipboard`,
        color: 'blue',
      });
    }
  };

  const aggSize = () => files.reduce((acc, file) => acc + file.size, 0);

  const upload = () => {
    const toPartialFiles: File[] = [];
    for (let i = 0; i !== files.length; ++i) {
      const file = files[i];
      if (config.chunks.enabled && file.size >= bytes(config.chunks.max)) {
        toPartialFiles.push(file);
      }
    }

    if (toPartialFiles.length > 0) {
      uploadPartialFiles(toPartialFiles, {
        setFiles,
        setLoading,
        setProgress,
        clipboard,
        clearEphemeral,
        options,
        ephemeral,
        config,
        folder,
      });
    } else {
      const size = aggSize();
      if (size > bytes(config.files.maxFileSize) && !toPartialFiles.length) {
        notifications.show({
          title: 'Upload may fail',
          color: 'yellow',
          icon: <IconDeviceSdCard size='1rem' />,
          message: (
            <>
              The upload may fail because the total size of the files (that are not being partially uploaded)
              you are trying to upload is <b>{bytes(size)}</b>, which is larger than the limit of{' '}
              <b>{bytes(bytes(config.files.maxFileSize))}</b>
            </>
          ),
        });
      }

      uploadFiles(files, {
        setFiles,
        setLoading,
        setProgress,
        clipboard,
        clearEphemeral,
        options,
        ephemeral,
        folder,
      });
    }
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>{title ?? 'Upload files'}</Title>

        {!folder && (
          <Tooltip label='View your files'>
            <ActionIcon component={Link} href='/dashboard/files' variant='outline' radius='sm'>
              <IconFiles size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      <Dropzone
        onDrop={(f) => setFiles([...f, ...files])}
        my='sm'
        loading={dropLoading}
        disabled={dropLoading}
      >
        <Group justify='center' gap='xl' style={{ minHeight: rem(220), pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              size='3.2rem'
              stroke={1.5}
              color={theme.colors[theme.primaryColor][colorScheme === 'dark' ? 4 : 6]}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size='3.2rem' stroke={1.5} color={theme.colors.red[colorScheme === 'dark' ? 4 : 6]} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFiles size='3.2rem' stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size='xl' inline>
              Drag images here or click to select files
            </Text>
            <Text size='sm' inline mt='xs'>
              Or <Kbd size='xs'>Ctrl</Kbd> + <Kbd size='xs'>V</Kbd> to paste images from clipboard
            </Text>
            <Text size='sm' c='dimmed' inline mt={7}>
              Attach as many files as you like, they will show up below to review before uploading.
            </Text>
            <Text size='sm' c='dimmed' mt={7}>
              <b>{bytes(bytes(config.files.maxFileSize))}</b> limit per file
            </Text>
          </div>
        </Group>
      </Dropzone>

      <Collapse in={progress.percent > 0 && progress.percent < 100}>
        {progress.percent > 0 && progress.percent < 100 && (
          <Progress.Root my='sm' size='xl'>
            <Progress.Section value={progress.percent} animated>
              <Progress.Label>{Math.floor(progress.percent)}%</Progress.Label>
            </Progress.Section>
          </Progress.Root>
        )}
      </Collapse>

      <Collapse in={progress.speed > 0 && progress.remaining > 0}>
        <Paper withBorder p='xs' radius='sm'>
          <Text ta='center' size='sm'>
            {bytes(progress.speed)}/s, {humanizeDuration(progress.remaining)} remaining
          </Text>
        </Paper>
      </Collapse>

      <Collapse in={progress.percent === 100}>
        <Paper withBorder p='xs' radius='sm'>
          <Text ta='center' size='sm' c='yellow' fw={500}>
            Finalizing upload(s)...
          </Text>
        </Paper>
      </Collapse>

      <Grid grow my='sm'>
        {files.map((file, i) => (
          <Grid.Col span={3} key={i}>
            <ToUploadFile
              loading={dropLoading}
              file={file}
              onDelete={() => setFiles(files.filter((_, j) => i !== j))}
            />
          </Grid.Col>
        ))}
      </Grid>

      <Group justify='right' gap='sm' my='md'>
        <UploadOptionsButton folder={folder} numFiles={files.length} />

        <Button
          variant='outline'
          leftSection={<IconUpload size={18} />}
          disabled={files.length === 0 || dropLoading}
          onClick={upload}
        >
          Upload {files.length} files ({bytes(aggSize())})
        </Button>
      </Group>
    </>
  );
}
