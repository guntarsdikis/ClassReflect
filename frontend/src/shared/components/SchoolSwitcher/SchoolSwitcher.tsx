import { useEffect } from 'react';
import { Group, Select, Text, ThemeIcon } from '@mantine/core';
import { IconSchool } from '@tabler/icons-react';
import { useAuthStore } from '@store/auth.store';
import { useSchoolContextStore, School } from '@store/school-context.store';
import { schoolsService } from '@features/schools/services/schools.service';
import { notifications } from '@mantine/notifications';

export function SchoolSwitcher() {
  const user = useAuthStore((state) => state.user);
  const {
    selectedSchool,
    availableSchools,
    setSelectedSchool,
    setAvailableSchools,
  } = useSchoolContextStore();

  // Only show for super admin
  if (user?.role !== 'super_admin') {
    return null;
  }

  // Load schools on mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const schools = await schoolsService.getAllSchools();
        setAvailableSchools(schools);
      } catch (error) {
        console.error('Failed to load schools:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load schools',
          color: 'red',
        });
      }
    };

    if (availableSchools.length === 0) {
      loadSchools();
    }
  }, [availableSchools.length, setAvailableSchools]);

  const handleSchoolChange = (value: string | null) => {
    if (!value) {
      setSelectedSchool(null);
      return;
    }

    const school = availableSchools.find(s => s.id.toString() === value);
    if (school) {
      setSelectedSchool(school);
    }
  };

  return (
    <Group gap="xs" visibleFrom="md">
      <ThemeIcon size="sm" variant="light" color="blue">
        <IconSchool size={14} />
      </ThemeIcon>
      <Select
        placeholder="Select school context"
        value={selectedSchool?.id.toString() || ''}
        onChange={handleSchoolChange}
        data={[
          { value: '', label: 'All Schools' },
          ...availableSchools.map(school => ({
            value: school.id.toString(),
            label: school.name,
          }))
        ]}
        size="sm"
        w={200}
        styles={{
          input: {
            fontSize: '12px',
          },
        }}
      />
      {selectedSchool && (
        <Text size="xs" c="dimmed">
          Context: {selectedSchool.name}
        </Text>
      )}
    </Group>
  );
}