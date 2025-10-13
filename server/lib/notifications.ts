import { db } from "../db";
import { notifications, instructorsAuth } from "../../shared/schema";
import type { NotificationType, NotificationMetadata } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Creates a notification for specific recipients
 */
export async function createNotification(
  recipientIds: number[],
  type: NotificationType,
  title: string,
  message: string,
  metadata: NotificationMetadata,
  createdBy?: number
) {
  try {
    const notificationsToInsert = recipientIds.map(recipientId => ({
      recipientId,
      type,
      title,
      message,
      metadata,
      read: false,
      createdBy,
    }));

    await db.insert(notifications).values(notificationsToInsert);
    console.log(`✅ Created ${notificationsToInsert.length} notification(s) of type: ${type}`);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Creates notifications for all users with specific roles
 */
export async function notifyUsersByRole(
  roles: ('owner' | 'reception' | 'instructor')[],
  type: NotificationType,
  title: string,
  message: string,
  metadata: NotificationMetadata,
  createdBy?: number
) {
  try {
    // Get all active users with specified roles
    const users = await db
      .select({ id: instructorsAuth.id })
      .from(instructorsAuth)
      .where(eq(instructorsAuth.status, 'active'));

    const recipientIds = users
      .filter(user => {
        // Filter by role - need to fetch full user data
        return true; // Placeholder - will be filtered properly
      })
      .map(user => user.id);

    if (recipientIds.length === 0) {
      console.log(`⚠️  No users found with roles: ${roles.join(', ')}`);
      return;
    }

    await createNotification(recipientIds, type, title, message, metadata, createdBy);
  } catch (error) {
    console.error('Error notifying users by role:', error);
    throw error;
  }
}

/**
 * Helper function to get users by role
 */
export async function getUsersByRole(roles: ('owner' | 'reception' | 'instructor')[]) {
  try {
    const users = await db
      .select({ id: instructorsAuth.id, role: instructorsAuth.role })
      .from(instructorsAuth)
      .where(eq(instructorsAuth.status, 'active'));

    return users.filter(user => user.role && roles.includes(user.role as any));
  } catch (error) {
    console.error('Error getting users by role:', error);
    return [];
  }
}

/**
 * Notify reception and owner about a new student added by instructor
 */
export async function notifyStudentAdded(
  studentName: string,
  groupId: string,
  groupName: string,
  missingFields: string[],
  createdBy: number
) {
  const recipients = await getUsersByRole(['owner', 'reception']);
  const recipientIds = recipients.map(u => u.id);

  if (recipientIds.length === 0) return;

  const missingText = missingFields.length > 0
    ? ` Brakuje: ${missingFields.join(', ')}`
    : '';

  const creator = await db
    .select({ firstName: instructorsAuth.firstName, lastName: instructorsAuth.lastName })
    .from(instructorsAuth)
    .where(eq(instructorsAuth.id, createdBy))
    .limit(1);

  const creatorName = creator[0] ? `${creator[0].firstName} ${creator[0].lastName}` : 'Instruktor';

  await createNotification(
    recipientIds,
    'student_added',
    'Nowy uczeń oczekuje na zatwierdzenie',
    `${creatorName} dodał ucznia ${studentName} do grupy ${groupName}. Status: oczekuje na zatwierdzenie.${missingText}`,
    {
      studentName,
      groupId,
      groupName,
      missingFields,
    },
    createdBy
  );
}

/**
 * Notify instructor about student approval
 */
export async function notifyStudentApproved(
  studentName: string,
  groupId: string,
  groupName: string,
  instructorId: number,
  approvedBy: number
) {
  const approver = await db
    .select({ firstName: instructorsAuth.firstName, lastName: instructorsAuth.lastName, role: instructorsAuth.role })
    .from(instructorsAuth)
    .where(eq(instructorsAuth.id, approvedBy))
    .limit(1);

  if (!approver[0]) return;

  const approverRole = approver[0].role === 'owner' ? 'Właściciel' : 'Recepcja';
  const approverName = `${approver[0].firstName} ${approver[0].lastName}`;

  await createNotification(
    [instructorId],
    'student_approved',
    'Uczeń zatwierdzony',
    `${approverRole} ${approverName} zatwierdził ucznia ${studentName} w grupie ${groupName}`,
    {
      studentName,
      groupId,
      groupName,
    },
    approvedBy
  );
}

/**
 * Notify instructor about student expulsion
 */
export async function notifyStudentExpelled(
  studentName: string,
  groupId: string,
  groupName: string,
  endDate: string,
  instructorId: number,
  expelledBy: number
) {
  const expeller = await db
    .select({ firstName: instructorsAuth.firstName, lastName: instructorsAuth.lastName, role: instructorsAuth.role })
    .from(instructorsAuth)
    .where(eq(instructorsAuth.id, expelledBy))
    .limit(1);

  if (!expeller[0]) return;

  const expellerRole = expeller[0].role === 'owner' ? 'Właściciel' : 'Recepcja';
  const expellerName = `${expeller[0].firstName} ${expeller[0].lastName}`;

  await createNotification(
    [instructorId],
    'student_expelled',
    'Uczeń wypisany',
    `${expellerRole} ${expellerName} wypisał ucznia ${studentName} z grupy ${groupName} (data końca: ${endDate})`,
    {
      studentName,
      groupId,
      groupName,
      date: endDate,
    },
    expelledBy
  );
}

/**
 * Notify reception and owner about attendance note
 */
export async function notifyAttendanceNote(
  studentName: string,
  groupId: string,
  groupName: string,
  date: string,
  notes: string,
  createdBy: number
) {
  const recipients = await getUsersByRole(['owner', 'reception']);
  const recipientIds = recipients.map(u => u.id);

  if (recipientIds.length === 0) return;

  const creator = await db
    .select({ firstName: instructorsAuth.firstName, lastName: instructorsAuth.lastName })
    .from(instructorsAuth)
    .where(eq(instructorsAuth.id, createdBy))
    .limit(1);

  const creatorName = creator[0] ? `${creator[0].firstName} ${creator[0].lastName}` : 'Instruktor';

  await createNotification(
    recipientIds,
    'attendance_note',
    'Nowa notatka o uczniu',
    `${creatorName} dodał notatkę do ucznia ${studentName} (grupa ${groupName}, ${date}): "${notes}"`,
    {
      studentName,
      groupId,
      groupName,
      date,
      notes,
    },
    createdBy
  );
}
