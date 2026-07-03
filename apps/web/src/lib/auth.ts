import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signOut as amplifySignOut,
} from 'aws-amplify/auth';

export type DocuFlowRole = "finance" | "admin"

export interface DocuFlowSession {
  authenticated: true
  role: DocuFlowRole
  userId: string
  name: string
  email: string
  firstName?: string
  lastName?: string
  emailVerified?: boolean
  groups?: string[]
  accessToken?: string
  idToken?: string
}

export const roleLabels: Record<DocuFlowRole, string> = {
  finance: "Finance",
  admin: "System administrator",
}

export const roleHomePaths: Record<DocuFlowRole, string> = {
  finance: "/dashboard",
  admin: "/operations",
}

function inferRoleFromCognito(groups?: string[]): DocuFlowRole {
  if (groups && groups.includes('docuflow-dev-admins')) {
    return 'admin';
  }
  return 'finance';
}

export async function getCurrentDocuFlowSession(): Promise<DocuFlowSession | null> {
  try {
    const { tokens } = await fetchAuthSession();
    if (!tokens) return null;

    const user = await getCurrentUser();
    const idToken = tokens.idToken;
    const accessToken = tokens.accessToken;
    const idPayload = idToken?.payload;
    const accessPayload = accessToken?.payload;
    const attributes = await fetchUserAttributes().catch(() => ({})) as Record<string, string | undefined>;
    
    const email = attributes.email || idPayload?.email?.toString() || user.signInDetails?.loginId || '';
    const firstName = attributes.given_name || idPayload?.given_name?.toString() || '';
    const lastName = attributes.family_name || idPayload?.family_name?.toString() || '';
    const fullNameFromParts = [firstName, lastName].filter(Boolean).join(' ').trim();
    const name = attributes.name || idPayload?.name?.toString() || fullNameFromParts || email.split('@')[0] || user.username;
    const userId = idPayload?.sub?.toString() || user.userId || user.username;
    const emailVerifiedValue = attributes.email_verified ?? idPayload?.email_verified;
    
    // AWS Cognito Groups might be in accessToken or idToken
    const groups = (idPayload?.['cognito:groups'] as string[]) || (accessPayload?.['cognito:groups'] as string[]) || [];
    const role = inferRoleFromCognito(groups);

    return {
      authenticated: true,
      role,
      userId,
      name,
      email,
      firstName,
      lastName,
      emailVerified: emailVerifiedValue === true || emailVerifiedValue === 'true',
      groups,
      accessToken: tokens.accessToken?.toString(),
      idToken: tokens.idToken?.toString()
    };
  } catch (error) {
    console.error("No active user session:", error);
    return null;
  }
}

export async function clearDocuFlowSession() {
  try {
    await amplifySignOut();
  } catch (error) {
    console.error("Sign out error", error);
  }
}

// Fallback functions that return boolean based on token presence or async context.
// In modern React, AuthContext is preferred over direct synchronous checks.
