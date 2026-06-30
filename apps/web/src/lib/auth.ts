import { fetchAuthSession, getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';

export type DocuFlowRole = "finance" | "admin"

export interface DocuFlowSession {
  authenticated: true
  role: DocuFlowRole
  userId: string
  name: string
  email: string
  accessToken?: string
}

export const roleLabels: Record<DocuFlowRole, string> = {
  finance: "Finance",
  admin: "System administrator",
}

export const roleHomePaths: Record<DocuFlowRole, string> = {
  finance: "/dashboard",
  admin: "/operations",
}

// Hàm hỗ trợ suy luận Role từ các group Cognito (nếu cấu hình)
// Trong phạm vi workshop, ta có thể dùng inferRole từ email hoặc nhóm.
function inferRoleFromCognito(groups?: string[], email?: string): DocuFlowRole {
  if (groups && groups.includes('docuflow-dev-admins')) {
    return 'admin';
  }
  if (email && email.toLowerCase().startsWith('admin')) {
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
    const payload = idToken?.payload;
    const email = payload?.email?.toString() || user.signInDetails?.loginId || '';
    const name = payload?.name?.toString() || email.split('@')[0] || user.username;
    
    // AWS Cognito Groups
    const groups = (payload?.['cognito:groups'] as string[]) || [];
    const role = inferRoleFromCognito(groups, email);

    return {
      authenticated: true,
      role,
      userId: user.username,
      name,
      email,
      accessToken: tokens.accessToken?.toString()
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
