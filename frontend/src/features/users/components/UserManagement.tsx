import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  Button,
  Table,
  ScrollArea,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  MultiSelect,
  Switch,
  Space,
  Flex,
  Alert,
  Tabs,
  NumberInput,
  FileButton,
  Textarea,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconUsers,
  IconSchool,
  IconUserPlus,
  IconUpload,
  IconDownload,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconSearch,
  IconKey,
  IconCopy,
  IconUser,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { format } from 'date-fns';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { usersService, User, CreateTeacherRequest, CreateUserRequest, UpdateUserRoleRequest } from '../services/users.service';
import { schoolsService, School } from '@features/schools/services/schools.service';
import { subjectsService, SchoolSubject } from '@features/schools/services/subjects.service';
import { useAuthStore } from '@store/auth.store';
import { useSchoolContextStore } from '@store/school-context.store';

interface TeacherFormData extends CreateTeacherRequest {
  schoolId: number;
  role?: 'teacher' | 'school_manager'; // For super admin user creation
}

interface UserFormData extends CreateUserRequest {
  // All fields from CreateUserRequest
}


interface BulkTeacher {
  email: string;
  firstName: string;
  lastName: string;
  subjects: string;
  grades: string;
}

export function UserManagement() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { selectedSchool } = useSchoolContextStore();
  const [teacherModalOpened, { open: openTeacherModal, close: closeTeacherModal }] = useDisclosure(false);
  const [bulkModalOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false);
  
  // Role-based access control
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isSchoolManager = currentUser.role === 'school_manager';
  
  // Determine which school ID to use
  const getEffectiveSchoolId = () => {
    if (isSuperAdmin) {
      return selectedSchool?.id || null;
    }
    return currentUser.schoolId;
  };
  
  const currentUserSchoolId = getEffectiveSchoolId();
  
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingRole, setChangingRole] = useState<User | null>(null);
  
  const [teacherFormData, setTeacherFormData] = useState<TeacherFormData>({
    email: '',
    firstName: '',
    lastName: '',
    subjects: [],
    grades: [],
    schoolId: 0,
    sendInviteEmail: true,
    role: 'teacher', // Default to teacher
  });

  // Composite create school + manager flow removed. Use Admin > Schools to create a school,
  // then use "Create User" with role "School Manager".

  const [bulkCsvContent, setBulkCsvContent] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  // Load data on component mount and when school context changes
  useEffect(() => {
    if (isSuperAdmin && !currentUserSchoolId) {
      // For super admin, wait for school selection
      setLoading(false);
      return;
    }
    if (currentUserSchoolId || isSchoolManager) {
      loadData();
    }
  }, [currentUserSchoolId, selectedSchool]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Removed verbose console logs
      
      if (isSuperAdmin) {
        // Load schools data for super admin
        const schoolsData = await schoolsService.getAllSchools();
        setSchools(schoolsData);
        
        if (currentUserSchoolId) {
          // Super admin with selected school - load users for that school (server-side filter)
          const usersData = await usersService.getAllUsers(currentUserSchoolId);
          setUsers(usersData);
          setFilterSchool(currentUserSchoolId.toString());
          await loadSchoolSubjects(currentUserSchoolId);
        } else {
          // Super admin without selected school - load all users
          const usersData = await usersService.getAllUsers();
          setUsers(usersData);
          setFilterSchool('all');
          
          // Load subjects for first school
          if (schoolsData.length > 0) {
            await loadSchoolSubjects(schoolsData[0].id);
          }
        }
      } else if (isSchoolManager) {
        // School manager can only see teachers from their school
        const [teachersData, schoolData] = await Promise.all([
          usersService.getTeachers(), // Use teachers endpoint which supports school managers
          schoolsService.getSchool(currentUserSchoolId),
        ]);
        
        setUsers(teachersData);
        setSchools([schoolData]);
        
        // Auto-set school filter for school managers
        setFilterSchool(currentUserSchoolId.toString());
        
        // Load subjects for the school manager's school
        await loadSchoolSubjects(currentUserSchoolId);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      console.error('Error details:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load user data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolSubjects = async (schoolId: number) => {
    try {
      const subjects = await subjectsService.getSchoolSubjects(schoolId);
      setSchoolSubjects(subjects);
    } catch (error) {
      console.error('Failed to load school subjects:', error);
      // Fall back to empty array - user can still create teachers without subjects
      setSchoolSubjects([]);
    }
  };

  // Load subjects when school changes in the form (for super admins)
  const handleSchoolChange = async (schoolId: number) => {
    setTeacherFormData({...teacherFormData, schoolId});
    if (isSuperAdmin && schoolId > 0) {
      await loadSchoolSubjects(schoolId);
    }
  };

  const handleCreateTeacher = () => {
    setEditingUser(null);
    setTeacherFormData({
      email: '',
      firstName: '',
      lastName: '',
      subjects: [],
      grades: [],
      schoolId: isSchoolManager ? currentUserSchoolId : 0,
      sendInviteEmail: true,
    });
    openTeacherModal();
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    if (user.role === 'teacher') {
      setTeacherFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subjects: user.subjects || [],
        grades: user.grades || [],
        schoolId: user.schoolId || 0,
        sendInviteEmail: false,
      });
      openTeacherModal();
    }
  };

  const handleRoleChange = async (user: User, newRole: 'teacher' | 'school_manager') => {
    try {
      const roleData: UpdateUserRoleRequest = {
        role: newRole,
        schoolId: user.schoolId
      };

      await usersService.updateUserRole(user.id, roleData);
      
      notifications.show({
        title: 'Role Updated',
        message: `${user.firstName} ${user.lastName} is now a ${newRole === 'school_manager' ? 'School Manager' : 'Teacher'}`,
        color: 'green',
      });

      // Refresh users list
      await loadData();
    } catch (error) {
      console.error('Failed to update user role:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update user role',
        color: 'red',
      });
    }
  };

  const confirmRoleChange = (user: User, newRole: 'teacher' | 'school_manager') => {
    const roleName = newRole === 'school_manager' ? 'School Manager' : 'Teacher';
    
    modals.openConfirmModal({
      title: 'Change User Role',
      children: (
        <Text>
          Are you sure you want to change <strong>{user.firstName} {user.lastName}</strong> from{' '}
          <strong>{user.role === 'school_manager' ? 'School Manager' : 'Teacher'}</strong> to{' '}
          <strong>{roleName}</strong>?
        </Text>
      ),
      labels: { confirm: `Change to ${roleName}`, cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: () => handleRoleChange(user, newRole),
    });
  };

  const handleSaveTeacher = async () => {
    try {
      if (!teacherFormData.email || !teacherFormData.firstName || !teacherFormData.lastName || !teacherFormData.schoolId) {
        notifications.show({
          title: 'Error',
          message: 'Please fill in all required fields',
          color: 'red',
        });
        return;
      }

      if (editingUser) {
        // Build update request - include schoolId only if super admin and school has changed
        const updateData: any = {
          subjects: teacherFormData.subjects,
          grades: teacherFormData.grades,
        };
        
        // Super admins can change school assignments
        if (isSuperAdmin && teacherFormData.schoolId !== editingUser.schoolId) {
          updateData.schoolId = teacherFormData.schoolId;
        }
        
        await usersService.updateTeacher(editingUser.id, updateData);
        
        const schoolChanged = isSuperAdmin && teacherFormData.schoolId !== editingUser.schoolId;
        const oldSchool = schools.find(s => s.id === editingUser.schoolId)?.name || 'Unknown';
        const newSchool = schools.find(s => s.id === teacherFormData.schoolId)?.name || 'Unknown';
        
        notifications.show({
          title: 'Success',
          message: schoolChanged 
            ? `Teacher updated and moved from ${oldSchool} to ${newSchool}` 
            : 'Teacher updated successfully',
          color: 'green',
        });
      } else {
        // Choose the correct service method based on role
        let result;
        if (teacherFormData.role === 'school_manager') {
          // Use the general createUser endpoint for school managers
          const userData: CreateUserRequest = {
            email: teacherFormData.email,
            firstName: teacherFormData.firstName,
            lastName: teacherFormData.lastName,
            role: 'school_manager',
            schoolId: teacherFormData.schoolId,
            sendInviteEmail: teacherFormData.sendInviteEmail,
          };
          result = await usersService.createUser(userData);
          notifications.show({
            title: 'Success',
            message: `School Manager created successfully. ${!teacherFormData.sendInviteEmail ? 'Temporary password: ' + result.temporaryPassword : ''}`,
            color: 'green',
          });
        } else {
          // Use the specific createTeacher endpoint for teachers
          result = await usersService.createTeacher(teacherFormData);
          notifications.show({
            title: 'Success',
            message: `Teacher created successfully. ${!teacherFormData.sendInviteEmail ? 'Temporary password: ' + result.temporaryPassword : ''}`,
            color: 'green',
          });
        }
      }
      
      await loadData();
      closeTeacherModal();
    } catch (error) {
      console.error('Failed to save teacher:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save teacher',
        color: 'red',
      });
    }
  };

  // Removed: handleSaveManager (composite flow removed)

  const handleBulkImport = async () => {
    try {
      if (!bulkCsvContent) {
        notifications.show({
          title: 'Error',
          message: 'Please provide CSV data',
          color: 'red',
        });
        return;
      }

      // Parse CSV content
      const lines = bulkCsvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        notifications.show({
          title: 'Error',
          message: 'CSV must have at least a header row and one data row',
          color: 'red',
        });
        return;
      }

      // Skip header row, parse data
      const teachers = lines.slice(1).map(line => {
        const [email, firstName, lastName, subjects, grades] = line.split(',').map(cell => cell.trim());
        return {
          email,
          firstName,
          lastName,
          subjects: subjects ? subjects.split(';').map(s => s.trim()) : [],
          grades: grades ? grades.split(';').map(g => g.trim()) : [],
        };
      });

      const result = await usersService.bulkCreateTeachers({ teachers });
      notifications.show({
        title: 'Bulk Import Complete',
        message: `${result.successful} successful, ${result.failed} failed`,
        color: result.failed > 0 ? 'yellow' : 'green',
      });

      // Suppress verbose import error logging in console
      
      await loadData();
      closeBulkModal();
    } catch (error) {
      console.error('Failed to bulk import:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to import teachers',
        color: 'red',
      });
    }
  };

  const handleResetPassword = async (user: User) => {
    modals.openConfirmModal({
      title: 'Reset Password',
      children: (
        <Text size="sm">
          Are you sure you want to reset the password for <strong>{user.firstName} {user.lastName}</strong>? 
          A new temporary password will be generated and they will need to change it on their next login.
        </Text>
      ),
      labels: { confirm: 'Reset Password', cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: () => confirmResetPassword(user.id),
    });
  };

  const confirmResetPassword = async (userId: number) => {
    try {
      // Removed debug logs
      
      // Use appropriate reset method based on user role
      let result;
      if (isSuperAdmin) {
        // Super admin can reset any user's password
        const resetResult = await usersService.resetUserPassword(userId);
        result = {
          teacherName: resetResult.userName,
          teacherEmail: resetResult.userEmail,
          temporaryPassword: resetResult.temporaryPassword
        };
      } else {
        // School managers can only reset teacher passwords
        result = await usersService.resetTeacherPassword(userId);
      }
      
      // Show password in a modal with copy functionality
      
      
      modals.open({
        title: 'Password Reset Successful',
        children: (
          <Stack gap="md">
            <Alert variant="light" color="green" icon={<IconCheck />}>
              Password has been reset successfully for <strong>{result.teacherName}</strong>
            </Alert>
            
            <div>
              <Text size="sm" fw={500} mb="xs">Temporary Password:</Text>
              <Group gap="xs">
                <TextInput
                  value={result.temporaryPassword}
                  readOnly
                  style={{ flex: 1 }}
                />
                <ActionIcon 
                  variant="light" 
                  color="blue"
                  onClick={() => {
                    navigator.clipboard.writeText(result.temporaryPassword);
                    notifications.show({
                      message: 'Password copied to clipboard',
                      color: 'blue',
                    });
                  }}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Group>
            </div>
            
            <Alert variant="light" color="yellow" icon={<IconAlertCircle />}>
              <Text size="sm">
                <strong>Important:</strong> Share this password securely with {result.teacherName} ({result.teacherEmail}). 
                They will be required to change it on their next login.
              </Text>
            </Alert>
          </Stack>
        ),
        size: 'md',
      });
      
      await loadData();
    } catch (error) {
      console.error('🔐 Failed to reset password:', error);
      console.error('🔐 Error details:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to reset password. Please try again.',
        color: 'red',
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    modals.openConfirmModal({
      title: 'Delete User',
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong>? 
          If they have associated teaching records, their account will be deactivated instead of deleted.
          This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete User', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => confirmDeleteUser(user.id),
    });
  };

  const confirmDeleteUser = async (userId: number) => {
    try {
      const result = await usersService.deleteTeacher(userId);
      notifications.show({
        title: 'Success',
        message: result.deleted ? 'User deleted successfully' : 'User deactivated successfully (had associated records)',
        color: 'green',
      });
      await loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete user',
        color: 'red',
      });
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.schoolName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesSchool = filterSchool === 'all' || user.schoolId?.toString() === filterSchool;
    // Removed filter debug logs
    return matchesSearch && matchesRole && matchesSchool;
  });
  
  // Removed filter summary logs

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'blue';
      case 'school_manager': return 'green';
      case 'super_admin': return 'red';
      default: return 'gray';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'teacher': return 'Teacher';
      case 'school_manager': return 'School Manager';
      case 'super_admin': return 'Super Admin';
      default: return role;
    }
  };

  // Show message for super admin when no school is selected
  if (isSuperAdmin && !currentUserSchoolId) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="No School Selected" color="blue">
          Please select a school from the school switcher above to manage users, or use "All Schools" mode to see all users.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl" wrap="wrap" gap="sm">
        <div>
          <Title order={1}>{isSchoolManager ? 'Teacher Management' : 'User Management'}</Title>
          <Text c="dimmed">
            {isSchoolManager 
              ? 'Manage teachers in your school'
              : selectedSchool && isSuperAdmin
              ? `Managing users for ${selectedSchool.name}`
              : 'Manage users, teachers, and school managers across the platform'
            }
          </Text>
        </div>
        <Group>
          {isSuperAdmin && (
            <Button
              leftSection={<IconUpload size={16} />}
              variant="light"
              onClick={openBulkModal}
            >
              Bulk Import
            </Button>
          )}
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={handleCreateTeacher}
          >
            {isSuperAdmin ? 'Create User' : 'Create Teacher'}
          </Button>
        </Group>
      </Group>

      {isSuperAdmin && (
        <Alert variant="light" color="blue" icon={<IconAlertCircle /> } mb="md">
          To add a new school with a manager: first create the school in <strong>Admin &gt; Schools</strong>, then return here and click <strong>Create User</strong> and choose <strong>School Manager</strong>.
        </Alert>
      )}

      {/* User Statistics */}
      <Group mb="xl" grow>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Total Users</Text>
              <Text fw={700} size="xl">{users.length}</Text>
            </div>
            <IconUsers size={40} color="var(--mantine-color-blue-6)" />
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Teachers</Text>
              <Text fw={700} size="xl">{users.filter(u => u.role === 'teacher').length}</Text>
            </div>
            <IconUserPlus size={40} color="var(--mantine-color-green-6)" />
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">School Managers</Text>
              <Text fw={700} size="xl">{users.filter(u => u.role === 'school_manager').length}</Text>
            </div>
            <IconSchool size={40} color="var(--mantine-color-orange-6)" />
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Active Users</Text>
              <Text fw={700} size="xl">{users.filter(u => u.isActive).length}</Text>
            </div>
            <IconCheck size={40} color="var(--mantine-color-teal-6)" />
          </Group>
        </Card>
      </Group>

      {/* Filters and Search */}
      <Card shadow="sm" p="lg" radius="md" withBorder mb="xl">
        <Group>
          <TextInput
            placeholder={isSchoolManager ? 'Search teachers...' : 'Search users...'}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          {isSuperAdmin && (
            <Select
              placeholder="Filter by role"
              value={filterRole}
              onChange={(value) => setFilterRole(value || 'all')}
              data={[
                { value: 'all', label: 'All Roles' },
                { value: 'teacher', label: 'Teachers' },
                { value: 'school_manager', label: 'School Managers' },
                { value: 'super_admin', label: 'Super Admins' },
              ]}
              w={200}
            />
          )}
        </Group>
      </Card>

      {/* Users Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>All Users ({filteredUsers.length})</Title>
        </Group>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">Loading users...</Text>
          </div>
        ) : (
          <ScrollArea>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User Details</Table.Th>
                <Table.Th>Role & School</Table.Th>
                <Table.Th>Subjects & Grades</Table.Th>
                <Table.Th>Status & Activity</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredUsers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Text c="dimmed">No users found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{user.firstName} {user.lastName}</Text>
                        <Text size="xs" c="dimmed">{user.email}</Text>
                        <Text size="xs" c="dimmed">ID: {user.id}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Badge
                          color={getRoleColor(user.role)}
                          variant="light"
                          mb={4}
                        >
                          {getRoleName(user.role)}
                        </Badge>
                        <Text size="xs" c="dimmed">{user.schoolName || 'No School'}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        {user.subjects && user.subjects.length > 0 && (
                          <Text size="xs">
                            Subjects: {user.subjects.join(', ')}
                          </Text>
                        )}
                        {user.grades && user.grades.length > 0 && (
                          <Text size="xs" c="dimmed">
                            Grades: {user.grades.join(', ')}
                          </Text>
                        )}
                        {(!user.subjects || user.subjects.length === 0) && 
                         (!user.grades || user.grades.length === 0) && (
                          <Text size="xs" c="dimmed">No subjects/grades</Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Badge
                          color={user.isActive ? 'green' : 'red'}
                          variant={user.isActive ? 'light' : 'filled'}
                          mb={4}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Created: {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </Text>
                        {user.lastLogin && (
                          <Text size="xs" c="dimmed">
                            Last login: {format(new Date(user.lastLogin), 'MMM dd, yyyy')}
                          </Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon 
                          variant="subtle" 
                          color="blue" 
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        {user.role === 'teacher' && (
                          <ActionIcon 
                            variant="subtle" 
                            color="gray"
                            onClick={() => handleEditUser(user)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        )}
                        {user.role !== 'super_admin' && (
                          <ActionIcon 
                            variant="subtle" 
                            color="blue"
                            onClick={() => handleResetPassword(user)}
                            title="Reset Password"
                          >
                            <IconKey size={16} />
                          </ActionIcon>
                        )}
                        {user.role !== 'super_admin' && (
                          <ActionIcon 
                            variant="subtle" 
                            color="red"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                        {/* Role Change Buttons - Super Admin Only */}
                        {isSuperAdmin && user.role !== 'super_admin' && (
                          <>
                            {user.role === 'teacher' && (
                              <ActionIcon 
                                variant="subtle" 
                                color="green"
                                onClick={() => confirmRoleChange(user, 'school_manager')}
                                title="Promote to Manager"
                              >
                                <IconUsers size={16} />
                              </ActionIcon>
                            )}
                            {user.role === 'school_manager' && (
                              <ActionIcon 
                                variant="subtle" 
                                color="blue"
                                onClick={() => confirmRoleChange(user, 'teacher')}
                                title="Change to Teacher"
                              >
                                <IconUser size={16} />
                              </ActionIcon>
                            )}
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          </ScrollArea>
        )}
      </Card>

      {/* Create/Edit Teacher Modal */}
      <Modal 
        opened={teacherModalOpened} 
        onClose={closeTeacherModal} 
        title={
          <Group>
            <IconUserPlus size={20} />
            <Text fw={600}>
              {editingUser ? 'Edit Teacher' : `Create New ${teacherFormData.role === 'school_manager' ? 'School Manager' : 'Teacher'}`}
            </Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          {/* Role Selection - Super Admin Only, Create Mode Only */}
          {isSuperAdmin && !editingUser && (
            <Select
              label="User Role"
              value={teacherFormData.role || 'teacher'}
              onChange={(value) => setTeacherFormData({
                ...teacherFormData, 
                role: value as 'teacher' | 'school_manager',
                // Reset subjects and grades when switching to manager
                subjects: value === 'school_manager' ? [] : teacherFormData.subjects,
                grades: value === 'school_manager' ? [] : teacherFormData.grades
              })}
              data={[
                { value: 'teacher', label: 'Teacher' },
                { value: 'school_manager', label: 'School Manager' }
              ]}
              required
            />
          )}
          
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="John"
              value={teacherFormData.firstName}
              onChange={(e) => setTeacherFormData({...teacherFormData, firstName: e.target.value})}
              required
              disabled={!!editingUser}
            />
            <TextInput
              label="Last Name"
              placeholder="Smith"
              value={teacherFormData.lastName}
              onChange={(e) => setTeacherFormData({...teacherFormData, lastName: e.target.value})}
              required
              disabled={!!editingUser}
            />
          </Group>

          <TextInput
            label="Email"
            placeholder="john.smith@school.edu"
            value={teacherFormData.email}
            onChange={(e) => setTeacherFormData({...teacherFormData, email: e.target.value})}
            required
            disabled={!!editingUser}
          />

          <Select
            label="School"
            placeholder="Select school"
            value={teacherFormData.schoolId.toString()}
            onChange={(value) => handleSchoolChange(parseInt(value || '0'))}
            data={schools.map(school => ({
              value: school.id.toString(),
              label: school.name,
            }))}
            required
            disabled={
              // Super admins can always change school, school managers can only select their own school when creating
              editingUser ? !isSuperAdmin : isSchoolManager
            }
            description={
              editingUser && isSuperAdmin 
                ? "As Super Admin, you can reassign teachers to different schools" 
                : undefined
            }
          />

          {/* Subjects and Grades - Only for Teachers */}
          {(!teacherFormData.role || teacherFormData.role === 'teacher') && (
            <Group grow>
              <MultiSelect
                label="Subjects"
                placeholder={schoolSubjects.length > 0 ? "Select subjects" : "No subjects available - school manager can add subjects"}
                value={teacherFormData.subjects}
                onChange={(subjects) => setTeacherFormData({...teacherFormData, subjects})}
                data={schoolSubjects.map(subject => ({
                  value: subject.subject_name,
                  label: subject.subject_name
                }))}
                disabled={schoolSubjects.length === 0}
                description={
                  schoolSubjects.length === 0 && isSchoolManager 
                    ? "Add subjects in Subject Management to assign them to teachers"
                    : undefined
                }
              />
              <MultiSelect
                label="Grades"
                placeholder="Select grades"
                value={teacherFormData.grades}
                onChange={(grades) => setTeacherFormData({...teacherFormData, grades})}
                data={[
                  'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
                ]}
              />
            </Group>
          )}

          {!editingUser && (
            <Switch
              label="Send invite email to teacher"
              checked={teacherFormData.sendInviteEmail}
              onChange={(event) => setTeacherFormData({...teacherFormData, sendInviteEmail: event.currentTarget.checked})}
            />
          )}

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeTeacherModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTeacher}
              leftSection={editingUser ? <IconCheck size={16} /> : <IconUserPlus size={16} />}
            >
              {editingUser 
                ? 'Update Teacher' 
                : `Create ${teacherFormData.role === 'school_manager' ? 'School Manager' : 'Teacher'}`
              }
            </Button>
          </Flex>
        </Stack>
      </Modal>

      {/* Composite Create School & Manager flow removed. */}

      {/* Bulk Import Modal */}
      <Modal 
        opened={bulkModalOpened} 
        onClose={closeBulkModal} 
        title={
          <Group>
            <IconUpload size={20} />
            <Text fw={600}>Bulk Import Teachers</Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <Alert color="blue" icon={<IconAlertCircle />}>
            Upload a CSV file with the following format:
            <br />
            <strong>email,firstName,lastName,subjects,grades</strong>
            <br />
            Subjects and grades should be separated by semicolons (e.g., "Math;Science")
          </Alert>

          <FileButton onChange={setBulkFile} accept=".csv">
            {(props) => (
              <Button {...props} leftSection={<IconUpload size={16} />}>
                Upload CSV File
              </Button>
            )}
          </FileButton>

          {bulkFile && (
            <Text size="sm" c="dimmed">
              Selected file: {bulkFile.name}
            </Text>
          )}

          <Text fw={500}>Or paste CSV content:</Text>
          <Textarea
            placeholder="email,firstName,lastName,subjects,grades&#10;john@school.edu,John,Smith,Math;Science,5;6"
            value={bulkCsvContent}
            onChange={(e) => setBulkCsvContent(e.target.value)}
            minRows={6}
          />

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeBulkModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkImport}
              leftSection={<IconUpload size={16} />}
            >
              Import Teachers
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}
