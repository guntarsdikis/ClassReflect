import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Anchor,
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useLogin } from '../services/auth.service';

export function LoginPage() {
  const [rememberMe, setRememberMe] = useState(false);
  const { mutate: login, isPending } = useLogin();
  
  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value: string) => {
        if (!value) return 'Email is required';
        if (!/^\S+@\S+$/.test(value)) return 'Invalid email';
        return null;
      },
      password: (value: string) => {
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return null;
      },
    },
  });
  
  const handleSubmit = (values: typeof form.values) => {
    login(values);
  };
  
  return (
    <Container size={460} my={30}>
      <Title ta="center" style={{ fontWeight: 900 }}>
        Welcome to ClassReflect
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Classroom Audio Analysis Platform
      </Text>
      
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb={20}>
          Sign In
        </Title>
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="teacher@school.edu"
            required
            {...form.getInputProps('email')}
            disabled={isPending}
          />
          
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps('password')}
            disabled={isPending}
          />
          
          <Group justify="space-between" mt="lg">
            <Checkbox
              label="Remember me"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.currentTarget.checked)}
              disabled={isPending}
            />
            <Anchor component={Link} to="/forgot-password" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          
          <Button 
            fullWidth 
            mt="xl" 
            type="submit"
            loading={isPending}
          >
            Sign In
          </Button>
        </form>
        
        <Text c="dimmed" size="xs" ta="center" mt={20}>
          No registration available. Accounts are created by your school administrator.
        </Text>
      </Paper>
      
      {/* Demo credentials for development */}
      {import.meta.env.DEV && (
        <Paper withBorder p="md" mt="xl" style={{ backgroundColor: '#f8f9fa' }}>
          <Text size="sm" fw={600} mb="xs">Demo Credentials:</Text>
          <Text size="xs" c="dimmed">Teacher: teacher@demo.com / teacher123</Text>
          <Text size="xs" c="dimmed">Manager: manager@demo.com / manager123</Text>
          <Text size="xs" c="dimmed">Admin: admin@demo.com / admin123</Text>
        </Paper>
      )}
      
      <Text c="dimmed" size="xs" ta="center" mt={20}>
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </Container>
  );
}