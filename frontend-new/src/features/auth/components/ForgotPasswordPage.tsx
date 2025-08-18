import { Link } from 'react-router-dom';
import {
  TextInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Anchor,
  Center,
  Box,
  rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft } from '@tabler/icons-react';
import { useForgotPassword } from '../services/auth.service';

export function ForgotPasswordPage() {
  const { mutate: forgotPassword, isPending, isSuccess } = useForgotPassword();
  
  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required';
        if (!/^\S+@\S+$/.test(value)) return 'Invalid email';
        return null;
      },
    },
  });
  
  const handleSubmit = (values: typeof form.values) => {
    forgotPassword(values.email);
  };
  
  return (
    <Container size={460} my={30}>
      <Title ta="center" style={{ fontWeight: 900 }}>
        Forgot your password?
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your email to get a reset link
      </Text>
      
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {!isSuccess ? (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput
              label="Your email"
              placeholder="teacher@school.edu"
              required
              {...form.getInputProps('email')}
              disabled={isPending}
            />
            
            <Group justify="space-between" mt="lg">
              <Anchor component={Link} to="/login" c="dimmed" size="sm">
                <Center inline>
                  <IconArrowLeft size={rem(12)} stroke={1.5} />
                  <Box ml={5}>Back to login</Box>
                </Center>
              </Anchor>
              
              <Button type="submit" loading={isPending}>
                Reset password
              </Button>
            </Group>
          </form>
        ) : (
          <Box>
            <Text ta="center" size="lg" fw={500} c="green">
              Check your email!
            </Text>
            <Text ta="center" mt="md" c="dimmed" size="sm">
              We've sent password reset instructions to {form.values.email}
            </Text>
            <Text ta="center" mt="xs" c="dimmed" size="sm">
              If you don't see the email, check your spam folder.
            </Text>
            <Group justify="center" mt="xl">
              <Anchor component={Link} to="/login" size="sm">
                <Center inline>
                  <IconArrowLeft size={rem(12)} stroke={1.5} />
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