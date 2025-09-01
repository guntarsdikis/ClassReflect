import {
  Container,
  Card,
  Text,
  Title,
  Stack,
  Button,
  ThemeIcon,
} from '@mantine/core';
import { IconChartLine } from '@tabler/icons-react';

export function MyProgress() {
  return (
    <Container size="xl">
      <Card shadow="sm" p="xl" radius="md" withBorder>
        <Stack align="center" spacing="xl">
          <ThemeIcon size={80} variant="light" color="blue">
            <IconChartLine size={40} />
          </ThemeIcon>
          <div style={{ textAlign: 'center' }}>
            <Title order={2} mb="md">Progress Analytics</Title>
            <Text c="dimmed" size="lg" mb="xl">
              Comprehensive progress tracking and analytics for your teaching development is coming soon.
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              This feature will include:
            </Text>
            <Stack spacing="xs" style={{ textAlign: 'left', maxWidth: 400 }}>
              <Text size="sm">📊 Monthly performance trends</Text>
              <Text size="sm">📈 Subject-specific improvement tracking</Text>
              <Text size="sm">🎯 Goal setting and achievement monitoring</Text>
              <Text size="sm">📋 Detailed feedback analysis</Text>
              <Text size="sm">🏆 Achievement milestones and badges</Text>
            </Stack>
          </div>
          <Button variant="light" size="lg" disabled>
            Coming Soon
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}