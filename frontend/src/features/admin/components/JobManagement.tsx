import { Container, Title, Text, Card } from '@mantine/core';

export function JobManagement() {
  return (
    <Container size="xl">
      <Title order={1} mb="xl">Job Management</Title>
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Text>Processing job monitoring and management - Coming Soon</Text>
      </Card>
    </Container>
  );
}