export enum ToolPermissionTier {
  READONLY = 'READONLY',
  COMMUNICATE = 'COMMUNICATE',
  WRITE_DATA = 'WRITE_DATA',
  WRITE_SYSTEM = 'WRITE_SYSTEM',
  ADMIN = 'ADMIN'
}

export interface Tool {
  name: string;
  description: string;
  schema: any; // JSON Schema for input
  permissionTier: ToolPermissionTier;
  execute(input: any): Promise<any>;
}
