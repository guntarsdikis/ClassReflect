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
  Alert,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useLogin, useCompleteChallenge } from '../services/auth.service';

export function LoginPage() {
  const [rememberMe, setRememberMe] = useState(false);
  const [challengeData, setChallengeData] = useState<{
    username: string;
    session: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  
  const { mutate: login, isPending: isLoginPending, data: loginData } = useLogin();
  const { mutate: completeChallenge, isPending: isChallengePending } = useCompleteChallenge();
  
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
  
  const challengeForm = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (value: string) => {
        if (!value) return 'New password is required';
        if (value.length < 12) return 'Password must be at least 12 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value)) {
          return 'Password must contain uppercase, lowercase, number and special character';
        }
        return null;
      },
      confirmPassword: (value: string, values) => {
        if (value !== values.newPassword) return 'Passwords do not match';
        return null;
      },
    },
  });
  
  const handleSubmit = (values: typeof form.values) => {
    login(values, {
      onSuccess: (data) => {
        if (data.challengeRequired) {
          setChallengeData({
            username: data.username!,
            session: data.session!,
            email: data.email!,
            temporaryPassword: values.password,
          });
        }
      },
    });
  };
  
  const handleChallengeSubmit = (values: typeof challengeForm.values) => {
    if (!challengeData) return;
    
    completeChallenge({
      username: challengeData.username,
      newPassword: values.newPassword,
      temporaryPassword: challengeData.temporaryPassword,
    });
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
        {challengeData ? (
          <>
            <Title order={2} ta="center" mb={20}>
              Password Change Required
            </Title>
            
            <Alert icon={<IconInfoCircle size={16} />} title="Temporary Password" color="blue" mb="lg">
              Your temporary password has been reset. Please create a new permanent password to continue.
            </Alert>
            
            <form onSubmit={challengeForm.onSubmit(handleChallengeSubmit)}>
              <PasswordInput
                label="New Password"
                placeholder="Enter your new password"
                required
                {...challengeForm.getInputProps('newPassword')}
                disabled={isChallengePending}
                description="Must be at least 12 characters with uppercase, lowercase, number and special character"
              />
              
              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm your new password"
                required
                mt="md"
                {...challengeForm.getInputProps('confirmPassword')}
                disabled={isChallengePending}
              />
              
              <Button 
                fullWidth 
                mt="xl" 
                type="submit"
                loading={isChallengePending}
              >
                Set New Password
              </Button>
            </form>
            
            <Button 
              variant="subtle" 
              fullWidth 
              mt="md" 
              onClick={() => setChallengeData(null)}
              disabled={isChallengePending}
            >
              Back to Login
            </Button>
          </>
        ) : (
          <>
            <Title order={2} ta="center" mb={20}>
              Sign In
            </Title>
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <TextInput
                label="Email"
                placeholder="teacher@school.edu"
                required
                {...form.getInputProps('email')}
                disabled={isLoginPending}
              />
              
              <PasswordInput
                label="Password"
                placeholder="Your password"
                required
                mt="md"
                {...form.getInputProps('password')}
                disabled={isLoginPending}
              />
              
              <Group justify="space-between" mt="lg">
                <Checkbox
                  label="Remember me"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.currentTarget.checked)}
                  disabled={isLoginPending}
                />
                <Anchor component={Link} to="/forgot-password" size="sm">
                  Forgot password?
                </Anchor>
              </Group>
              
              <Button 
                fullWidth 
                mt="xl" 
                type="submit"
                loading={isLoginPending}
              >
                Sign In
              </Button>
            </form>
            
            <Text c="dimmed" size="xs" ta="center" mt={20}>
              No registration available. Accounts are created by your school administrator.
            </Text>
          </>
        )}
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