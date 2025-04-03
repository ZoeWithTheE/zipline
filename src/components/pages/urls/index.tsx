import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { Url } from '@/lib/db/models/url';
import { fetchApi } from '@/lib/fetchApi';
import { useViewStore } from '@/lib/store/view';
import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink, IconLink, IconLinkOff } from '@tabler/icons-react';
import Link from 'next/link';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { mutate } from 'swr';
import UrlGridView from './views/UrlGridView';
import UrlTableView from './views/UrlTableView';

export default function DashboardURLs() {
  const clipboard = useClipboard();
  const view = useViewStore((state) => state.urls);

  const [open, setOpen] = useQueryState('cuopen', parseAsBoolean.withDefault(false));

  const form = useForm<{
    url: string;
    vanity: string;
    maxViews: '' | number;
    password: string;
    enabled: boolean;
  }>({
    initialValues: {
      url: '',
      vanity: '',
      maxViews: '',
      password: '',
      enabled: true,
    },
    validate: {
      url: (value) => (value.length < 1 ? 'URL is required' : null),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (URL.canParse(values.url) === false) return form.setFieldError('url', 'Invalid URL');

    const { data, error } = await fetchApi<
      Extract<
        Response['/api/user/urls'],
        {
          url: string;
        } & Omit<Url, 'password'>
      >
    >(
      '/api/user/urls',
      'POST',
      {
        destination: values.url,
        vanity: values.vanity.trim() || null,
        enabled: values.enabled ?? true,
      },
      {
        ...(values.maxViews !== '' && { 'x-zipline-max-views': String(values.maxViews) }),
        ...(values.password !== '' && { 'x-zipline-password': values.password }),
      },
    );

    if (error) {
      notifications.show({
        title: 'Failed to shorten URL',
        message: error.error,
        color: 'red',
        icon: <IconLinkOff size='1rem' />,
      });
    } else {
      setOpen(false);

      const open = () => (values.enabled ? window.open(data?.url, '_blank') : null);
      const copy = () => {
        if (!values.enabled) return;

        clipboard.copy(data?.url);
        notifications.show({
          title: 'Copied URL to clipboard',
          message: (
            <Anchor component={Link} href={data?.url ?? ''} target='_blank'>
              {data?.url}
            </Anchor>
          ),
          color: 'blue',
          icon: <IconClipboardCopy size='1rem' />,
        });
      };

      modals.open({
        title: 'Shortened URL',
        size: 'auto',
        children: (
          <Group justify='space-between'>
            <Group justify='left'>
              {data?.enabled ? (
                <Anchor component={Link} href={data?.url ?? ''}>
                  {data?.url}
                </Anchor>
              ) : (
                <Text>{data?.url}</Text>
              )}
            </Group>
            <Group justify='right'>
              {data?.enabled && (
                <Tooltip label='Open link in a new tab'>
                  <ActionIcon onClick={() => open()} variant='filled'>
                    <IconExternalLink size='1rem' />
                  </ActionIcon>
                </Tooltip>
              )}
              <Tooltip label='Copy link to clipboard'>
                <ActionIcon onClick={() => copy()} variant='filled'>
                  <IconClipboardCopy size='1rem' />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        ),
      });

      mutate('/api/user/urls');
      form.reset();
    }
  };

  return (
    <>
      <Modal centered opened={open} onClose={() => setOpen(false)} title='Shorten URL'>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap='sm'>
            <TextInput label='URL' placeholder='https://example.com' {...form.getInputProps('url')} />
            <TextInput
              label='Vanity'
              description='Optional field, leave blank to generate a random code'
              placeholder='example'
              {...form.getInputProps('vanity')}
            />

            <NumberInput
              label='Max views'
              description='Optional field, leave blank to disable a view limit.'
              min={0}
              {...form.getInputProps('maxViews')}
            />

            <Switch
              label='Enabled'
              description='Allow or prevent this URL from being visited'
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />

            <PasswordInput
              label='Password'
              description='Protect your link with a password'
              autoComplete='off'
              {...form.getInputProps('password')}
            />

            <Button type='submit' variant='outline' radius='sm' leftSection={<IconLink size='1rem' />}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>URLs</Title>

        <Tooltip label='Shorten a URL'>
          <ActionIcon variant='outline' onClick={() => setOpen(true)}>
            <IconLink size='1rem' />
          </ActionIcon>
        </Tooltip>

        <GridTableSwitcher type='urls' />
      </Group>

      {view === 'grid' ? <UrlGridView /> : <UrlTableView />}
    </>
  );
}
