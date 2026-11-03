export interface AuditFields {
  CreatedBy: string | null;
  CreatedDate: string;
  UpdatedBy: string | null;
  UpdatedDate: string | null;
}

export interface User extends AuditFields {
  Id: number;
  Name: string;
  Email: string;
  IsActive: boolean;
  RoleId?: number | null;
  RoleName?: string | null;
}

export interface Role extends AuditFields {
  Id: number;
  NewId: string;
  Name: string;
  IsActive: boolean;
  MenuCount?: number;
  ActionCount?: number;
}

export interface RoleClaim extends AuditFields {
  Id: number;
  RoleId: number;
  Name: string;
  Email: string;
  IsActive: boolean;
}

export interface Paged<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface RoleAccess {
  menus: string[];
  actions: string[];
}

export interface NavMenu {
  id: string;
  label: string;
  parentId: string | null;
  path: string;
  icon: string;
}

export interface CurrentUser {
  name: string;
  email: string;
  role: { id: number; name: string } | null;
  menus: string[];
  actions: string[];
  navigation: NavMenu[];
}
