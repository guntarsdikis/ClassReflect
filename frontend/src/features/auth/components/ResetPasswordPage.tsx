import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Anchor,
  Center,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft } from '@tabler/icons-react';
import { useResetPassword } from '../services/auth.service';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { mutate: resetPassword, isPending, isSuccess } = useResetPassword();

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: value => {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return 'Please confirm your password';
        if (value !== values.password) return 'Passwords do not match';
        return null;
      },
    },
  });

  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleSubmit = (values: typeof form.values) => {
    resetPassword({ token, password: values.password });
  };

  return (
    <Container size={460} my={30}>
      <Title ta="center" style={{ fontWeight: 900 }}>
        Reset your password
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Choose a new password for your account
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {!isSuccess ? (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <PasswordInput
              label="New password"
              placeholder="Enter a strong password"
              required
              {...form.getInputProps('password')}
              disabled={isPending}
            />
            <PasswordInput
              mt="md"
              label="Confirm password"
              placeholder="Re-enter your password"
              required
              {...form.getInputProps('confirmPassword')}
              disabled={isPending}
            />

            <Group justify="space-between" mt="lg">
              <Anchor component={Link} to="/login" c="dimmed" size="sm">
                <Center inline>
                  <IconArrowLeft size={12} stroke={1.5} />
                  <Box ml={5}>Back to login</Box>
                </Center>
              </Anchor>

              <Button type="submit" loading={isPending}>
                Save new password
              </Button>
            </Group>
          </form>
        ) : (
          <Box>
            <Text ta="center" size="lg" fw={500} c="green">
              Password updated!
            </Text>
            <Text ta="center" mt="md" c="dimmed" size="sm">
              You can now log in with your new password.
            </Text>
            <Group justify="center" mt="xl">
              <Anchor component={Link} to="/login" size="sm">
                <Center inline>
                  <IconArrowLeft size={12} stroke={1.5} />
                  <Box ml={5}>Back to login</Box>
                </Center>
              </Anchor>
            </Group>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
