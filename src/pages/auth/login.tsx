import ExternalAuthButton from '@/components/pages/login/ExternalAuthButton';
import { Response } from '@/lib/api/response';
import { SafeConfig } from '@/lib/config/safe';
import { getZipline } from '@/lib/db/models/zipline';
import { fetchApi } from '@/lib/fetchApi';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { authenticateWeb } from '@/lib/passkey';
import { eitherTrue } from '@/lib/primitive';
import {
  Button,
  Center,
  Divider,
  Group,
  Image,
  LoadingOverlay,
  Modal,
  Paper,
  PasswordInput,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications, showNotification } from '@mantine/notifications';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogleFilled,
  IconCircleKeyFilled,
  IconKey,
  IconShieldQuestion,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

export default function Login({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<Response['/api/user']>('/api/user', {
    refreshInterval: 120000,
  });

  const showLocalLogin =
    router.query.local === 'true' ||
    !(
      config.oauth.bypassLocalLogin && Object.values(config.oauthEnabled).filter((x) => x === true).length > 0
    );

  const willRedirect =
    config.oauth.bypassLocalLogin &&
    Object.values(config.oauthEnabled).filter((x) => x === true).length === 1 &&
    router.query.local !== 'true';

  const [totpOpen, setTotpOpen] = useState(false);
  const [pinDisabled, setPinDisabled] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pin, setPin] = useState('');

  const [passkeyErrored, setPasskeyErrored] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    if (data?.user) {
      router.push('/dashboard');
    }
  }, [data]);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => (value.length > 1 ? null : 'Username is required'),
      password: (value) => (value.length > 1 ? null : 'Password is required'),
    },
  });

  const onSubmit = async (values: typeof form.values, code: string | undefined = undefined) => {
    setPinDisabled(true);
    setPinError('');

    const { username, password } = values;

    const { data, error } = await fetchApi<Response['/api/auth/login']>('/api/auth/login', 'POST', {
      username,
      password,
      code,
    });

    if (error) {
      if (error.error === 'Invalid username') form.setFieldError('username', 'Invalid username');
      else if (error.error === 'Invalid password') form.setFieldError('password', 'Invalid password');
      else if (error.error === 'Invalid code') setPinError(error.error!);
      setPinDisabled(false);
    } else {
      if (data!.totp) {
        setTotpOpen(true);
        setPinDisabled(false);
        return;
      }

      mutate(data as Response['/api/user']);
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value);

    if (value.length === 6) {
      onSubmit(form.values, value);
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      setPasskeyLoading(true);
      const res = await authenticateWeb();

      const { data, error } = await fetchApi<Response['/api/auth/webauthn']>('/api/auth/webauthn', 'POST', {
        auth: res.toJSON(),
      });
      if (error) {
        setPasskeyErrored(true);
        setPasskeyLoading(false);
        notifications.show({
          title: 'Error while authenticating with passkey',
          message: error.error,
          color: 'red',
        });
      } else {
        mutate(data as Response['/api/user']);
      }
    } catch {
      setPasskeyErrored(true);
      setPasskeyLoading(false);
    }
  };

  useEffect(() => {
    if (willRedirect) {
      const provider = Object.keys(config.oauthEnabled).find(
        (x) => config.oauthEnabled[x as keyof SafeConfig['oauthEnabled']] === true,
      );

      if (provider) {
        router.push(`/api/auth/oauth/${provider}`);
      }
    }
  }, []);

  useEffect(() => {
    if (passkeyErrored) {
      setTimeout(() => {
        setPasskeyErrored(false);
      }, 3000);

      showNotification({
        title: 'Error while authenticating with passkey',
        message: 'Please try again',
        color: 'red',
        icon: <IconX size='1rem' />,
      });
    }
  }, [passkeyErrored]);

  return (
    <>
      {willRedirect && !showLocalLogin && <LoadingOverlay visible />}

      <Modal onClose={() => {}} title='Enter code' opened={totpOpen} withCloseButton={false}>
        <Center>
          <PinInput
            data-autofocus
            length={6}
            oneTimeCode
            type='number'
            placeholder=''
            onChange={handlePinChange}
            autoFocus={true}
            error={!!pinError}
            disabled={pinDisabled}
            size='xl'
          />
        </Center>
        {pinError && (
          <Text ta='center' size='sm' c='red' mt={0}>
            {pinError}
          </Text>
        )}

        <Group mt='sm' grow>
          <Button
            leftSection={<IconX size='1rem' />}
            color='red'
            variant='outline'
            onClick={() => {
              setTotpOpen(false);
              form.reset();
            }}
          >
            Cancel login attempt
          </Button>
          <Button
            leftSection={<IconShieldQuestion size='1rem' />}
            loading={pinDisabled}
            type='submit'
            onClick={() => onSubmit(form.values, pin)}
          >
            Verify
          </Button>
        </Group>
      </Modal>

      <Center h='100vh'>
        {config.website.loginBackground && (
          <Image
            src={config.website.loginBackground}
            alt={config.website.loginBackground + ' failed to load'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              ...(config.website.loginBackgroundBlur && { filter: 'blur(10px)' }),
            }}
          />
        )}

        <Paper
          w='350px'
          p='xl'
          shadow='xl'
          withBorder
          style={{
            backgroundColor: config.website.loginBackground ? 'rgba(0, 0, 0, 0)' : undefined,
            backdropFilter: config.website.loginBackgroundBlur ? 'blur(35px)' : undefined,
          }}
        >
          <div style={{ width: '100%', overflowWrap: 'break-word' }}>
            <Title
              order={1}
              ta='center'
              style={{
                whiteSpace: 'normal',
                fontSize: `clamp(20px, ${Math.max(50 - (config.website.title?.length ?? 0) / 2, 20)}px, 50px)`,
              }}
            >
              <b>{config.website.title ?? 'Zipline'}</b>
            </Title>
          </div>

          {showLocalLogin && (
            <>
              <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
                <Stack my='sm'>
                  <TextInput
                    size='md'
                    placeholder='Enter your username...'
                    styles={{
                      input: {
                        backgroundColor: config.website.loginBackground ? 'transparent' : undefined,
                      },
                    }}
                    {...form.getInputProps('username', { withError: true })}
                  />

                  <PasswordInput
                    size='md'
                    placeholder='Enter your password...'
                    styles={{
                      input: {
                        backgroundColor: config.website.loginBackground ? 'transparent' : undefined,
                      },
                    }}
                    {...form.getInputProps('password')}
                  />

                  <Button
                    size='md'
                    fullWidth
                    type='submit'
                    loading={isLoading}
                    variant={config.website.loginBackground ? 'outline' : 'filled'}
                  >
                    Login
                  </Button>
                </Stack>
              </form>
            </>
          )}

          <Stack my='xs'>
            {eitherTrue(config.features.oauthRegistration, config.features.userRegistration) && (
              <Divider label='or' />
            )}

            {config.mfa.passkeys && (
              <Button
                onClick={handlePasskeyLogin}
                size='md'
                fullWidth
                variant='outline'
                leftSection={<IconKey size='1rem' />}
                color={passkeyErrored ? 'red' : undefined}
                loading={passkeyLoading}
              >
                Login with passkey
              </Button>
            )}

            {config.features.userRegistration && (
              <Button
                component={Link}
                href='/auth/register'
                size='md'
                fullWidth
                variant='outline'
                leftSection={<IconUserPlus size='1rem' />}
              >
                Sign up
              </Button>
            )}
            <Group grow>
              {config.oauthEnabled.discord && (
                <ExternalAuthButton
                  provider='Discord'
                  leftSection={<IconBrandDiscordFilled stroke={4} size='1.1rem' />}
                />
              )}
              {config.oauthEnabled.github && (
                <ExternalAuthButton provider='GitHub' leftSection={<IconBrandGithubFilled size='1.1rem' />} />
              )}
              {config.oauthEnabled.google && (
                <ExternalAuthButton
                  provider='Google'
                  leftSection={<IconBrandGoogleFilled stroke={4} size='1.1rem' />}
                />
              )}
              {config.oauthEnabled.oidc && (
                <ExternalAuthButton provider='OIDC' leftSection={<IconCircleKeyFilled size='1.1rem' />} />
              )}
            </Group>
          </Stack>
        </Paper>
      </Center>
    </>
  );
}

export const getServerSideProps = withSafeConfig(async () => {
  const { firstSetup } = await getZipline();

  if (firstSetup)
    return {
      redirect: {
        destination: '/setup',
        permanent: false,
      },
    };

  return {};
});

Login.title = 'Login';
